import 'server-only';

import { createServiceClient } from '../supabase/server';
import { readCache, writeCache, type SubjectType } from './cache';
import { retrieveJobsForProfile, retrieveProfilesForJob } from './retrieval';
import { fallbackRanking, rerank, type RerankCandidate } from './rerank';
import { jobToText, talentToText } from './text';

/**
 * The matching pipeline, end to end: cache → retrieve → re-rank → cache.
 *
 * ADR-002's shape, and the ordering is load-bearing at every step:
 *
 *   1. Cache first, so a warm read never touches a third party and stays inside the 800ms
 *      p95 budget.
 *   2. Hard filters inside the retrieval SQL, so the expensive stage only ever sees
 *      candidates the user could actually engage.
 *   3. Re-rank at most 20, because that is what calibration costs and where it stops paying.
 *   4. Write through, so the next reader is warm.
 *
 * FALLBACK IS NOT AN ERROR PATH, it is a supported mode. The free tier returns 503 under load
 * — observed, not theorised — so a matching feature that breaks when the model is busy is a
 * matching feature that breaks. When re-ranking fails, callers get the vector ordering with
 * `score: -1`, which the UI renders as a ranked list with no numbers. Correctly ordered and
 * honestly unlabelled beats confidently wrong.
 */

export type Match = {
  targetId: string;
  /** 0-100 when calibrated; -1 when the ranking came from vectors alone. */
  score: number;
  reason: string | null;
  /** False means "ordering is real, the number is not" — the UI must hide the score. */
  calibrated: boolean;
};

export type MatchOptions = { limit?: number; skipCache?: boolean };

/** Candidates for a job — the client direction. */
export async function matchesForJob(jobId: string, options: MatchOptions = {}): Promise<Match[]> {
  return run('job', jobId, options, async () => {
    const supabase = createServiceClient();
    const { data: job } = await supabase
      .from('jobs')
      .select(
        'embedding, title, description, requirements, responsibilities, engagement_type, location_type, experience_level, job_skills ( is_required, skills ( name ) )',
      )
      .eq('id', jobId)
      .maybeSingle()
      .overrideTypes<JobRow>();

    // No embedding means the job is too sparse, or ingest has not caught up. Either way there
    // is nothing to match against, and an empty list is the honest answer.
    if (!job?.embedding) return null;

    const vector = parseVector(job.embedding);
    if (!vector) return null;

    const candidates = await retrieveProfilesForJob(vector, { limit: options.limit });
    if (candidates.length === 0) return { brief: '', candidates: [] };

    const texts = await talentTexts(candidates.map((c) => c.id));
    return {
      brief: jobToText({
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities,
        engagementType: job.engagement_type,
        locationType: job.location_type,
        experienceLevel: job.experience_level,
        skills: (job.job_skills ?? [])
          .filter((s) => s.skills)
          .map((s) => ({ name: s.skills!.name, isRequired: s.is_required })),
      }),
      candidates: candidates
        .map((c) => ({ id: c.id, similarity: c.similarity, text: texts.get(c.id) ?? '' }))
        .filter((c) => c.text.length > 0),
    };
  });
}

/** Jobs for a developer — the talent direction. */
export async function matchesForTalent(
  talentId: string,
  options: MatchOptions = {},
): Promise<Match[]> {
  return run('talent', talentId, options, async () => {
    const supabase = createServiceClient();
    const { data: profile } = await supabase
      .from('talent_profiles')
      .select(
        'embedding, headline, bio, availability, years_experience, timezone, talent_skills ( proficiency, years, skills ( name ) ), portfolio_items ( title, description, role, outcome, tech_stack ), talent_certifications ( name, issuer )',
      )
      .eq('id', talentId)
      .maybeSingle()
      .overrideTypes<TalentRow>();

    if (!profile?.embedding) return null;
    const vector = parseVector(profile.embedding);
    if (!vector) return null;

    const candidates = await retrieveJobsForProfile(vector, talentId, { limit: options.limit });
    if (candidates.length === 0) return { brief: '', candidates: [] };

    const texts = await jobTexts(candidates.map((c) => c.id));
    return {
      brief: talentToText({
        headline: profile.headline,
        bio: profile.bio,
        availability: profile.availability,
        yearsExperience: profile.years_experience,
        timezone: profile.timezone,
        skills: (profile.talent_skills ?? [])
          .filter((s) => s.skills)
          .map((s) => ({ name: s.skills!.name, proficiency: s.proficiency, years: s.years })),
        items: (profile.portfolio_items ?? []).map((i) => ({
          title: i.title,
          description: i.description,
          role: i.role,
          outcome: i.outcome,
          techStack: (i.tech_stack ?? []) as string[],
        })),
        certifications: profile.talent_certifications ?? [],
      }),
      candidates: candidates
        .map((c) => ({ id: c.id, similarity: c.similarity, text: texts.get(c.id) ?? '' }))
        .filter((c) => c.text.length > 0),
    };
  });
}

type Prepared = { brief: string; candidates: RerankCandidate[] } | null;

async function run(
  subjectType: SubjectType,
  subjectId: string,
  options: MatchOptions,
  prepare: () => Promise<Prepared>,
): Promise<Match[]> {
  if (!options.skipCache) {
    const cached = await readCache(subjectType, subjectId);
    // Anything cached was calibrated — writeCache refuses to store a fallback ranking.
    if (cached) {
      return cached.map((c) => ({
        targetId: c.targetId,
        score: c.score,
        reason: c.reason,
        calibrated: true,
      }));
    }
  }

  const prepared = await prepare();
  if (!prepared) return [];
  if (prepared.candidates.length === 0) return [];

  const result = await rerank(prepared.brief, prepared.candidates);

  if (!result.ok) {
    // Not cached: freezing a degraded result for six hours because the model was busy for one
    // request is worse than re-deriving it next time.
    console.warn(`[match] re-rank unavailable for ${subjectType} ${subjectId}: ${result.reason}`);
    return fallbackRanking(prepared.candidates).map((item) => ({
      targetId: item.id,
      score: -1,
      reason: null,
      calibrated: false,
    }));
  }

  await writeCache(subjectType, subjectId, result.items);
  return result.items.map((item) => ({
    targetId: item.id,
    score: item.score,
    reason: item.reason || null,
    calibrated: true,
  }));
}

/**
 * pgvector returns a vector column as its text form, `[0.1,0.2,…]`.
 * Returns null rather than throwing on anything unexpected — an unparseable vector is a row
 * that cannot match, not a request that should fail.
 */
function parseVector(raw: unknown): number[] | null {
  if (Array.isArray(raw)) return raw as number[];
  if (typeof raw !== 'string') return null;
  try {
    const values = JSON.parse(raw) as unknown;
    return Array.isArray(values) ? (values as number[]) : null;
  } catch {
    return null;
  }
}

type JobRow = {
  embedding: string | null;
  title: string;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  engagement_type: string | null;
  location_type: string | null;
  experience_level: string | null;
  job_skills: { is_required: boolean; skills: { name: string } | null }[];
};

type TalentRow = {
  embedding: string | null;
  headline: string;
  bio: string | null;
  availability: string | null;
  years_experience: number | null;
  timezone: string | null;
  talent_skills: {
    proficiency: string | null;
    years: number | null;
    skills: { name: string } | null;
  }[];
  portfolio_items: {
    title: string;
    description: string;
    role: string | null;
    outcome: string | null;
    tech_stack: string[];
  }[];
  talent_certifications: { name: string; issuer: string }[];
};

/** The candidate text the model judges — the same representation that was embedded. */
async function talentTexts(ids: string[]): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('talent_profiles')
    .select(
      'id, headline, bio, availability, years_experience, timezone, talent_skills ( proficiency, years, skills ( name ) ), portfolio_items ( title, description, role, outcome, tech_stack ), talent_certifications ( name, issuer )',
    )
    .in('id', ids)
    .overrideTypes<(TalentRow & { id: string })[]>();

  const out = new Map<string, string>();
  for (const row of data ?? []) {
    out.set(
      row.id,
      talentToText({
        headline: row.headline,
        bio: row.bio,
        availability: row.availability,
        yearsExperience: row.years_experience,
        timezone: row.timezone,
        skills: (row.talent_skills ?? [])
          .filter((s) => s.skills)
          .map((s) => ({ name: s.skills!.name, proficiency: s.proficiency, years: s.years })),
        items: (row.portfolio_items ?? []).map((i) => ({
          title: i.title,
          description: i.description,
          role: i.role,
          outcome: i.outcome,
          techStack: (i.tech_stack ?? []) as string[],
        })),
        certifications: row.talent_certifications ?? [],
      }),
    );
  }
  return out;
}

async function jobTexts(ids: string[]): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('jobs')
    .select(
      'id, title, description, requirements, responsibilities, engagement_type, location_type, experience_level, job_skills ( is_required, skills ( name ) )',
    )
    .in('id', ids)
    .overrideTypes<(JobRow & { id: string })[]>();

  const out = new Map<string, string>();
  for (const row of data ?? []) {
    out.set(
      row.id,
      jobToText({
        title: row.title,
        description: row.description,
        requirements: row.requirements,
        responsibilities: row.responsibilities,
        engagementType: row.engagement_type,
        locationType: row.location_type,
        experienceLevel: row.experience_level,
        skills: (row.job_skills ?? [])
          .filter((s) => s.skills)
          .map((s) => ({ name: s.skills!.name, isRequired: s.is_required })),
      }),
    );
  }
  return out;
}
