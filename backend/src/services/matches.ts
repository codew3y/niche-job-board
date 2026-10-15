import 'server-only';

import { readCache } from '../matching/cache';
import { createClient, createServiceClient } from '../supabase/server';

/**
 * Match feeds, read from the warm cache.
 *
 * NEVER computes. If there is no cached ranking the answer is "not ready", and the page says
 * so — it does not trigger a re-rank and make the reader wait. On the free tier that wait is
 * 30 to 120 seconds (measured), which is not a page load, it is an outage with a spinner.
 * `backend/src/matching/warm.ts` fills the cache on a schedule.
 *
 * THE SCORE ASYMMETRY (the score-asymmetry rule) IS ENFORCED HERE, not in the UI. A client receives
 * ordering and a reason and never a number; a developer receives their own score on their own
 * matches. Leaving that to a component means one forgotten prop leaks it.
 */

export type TalentMatch = {
  jobId: string;
  slug: string;
  title: string;
  companyName: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  currency: string;
  engagementType: string;
  locationType: string;
  /** Their own score, on their own matches. Null when the ranking is uncalibrated. */
  score: number | null;
  reason: string | null;
};

export type CandidateMatch = {
  talentId: string;
  slug: string;
  headline: string;
  portfolioItemCount: number;
  websiteUrl: string | null;
  /** Whether a client can start a conversation (the developer's messages switch). */
  acceptsMessages: boolean;
  avatarUrl: string | null;
  /** DELIBERATELY ABSENT. A client sees order and reason, never a number. */
  reason: string | null;
};

export type MatchFeed<T> =
  | { state: 'ready'; matches: T[] }
  /** Nothing cached yet. The warmer has not reached this subject — not an error. */
  | { state: 'pending' }
  /** Warm, and genuinely nothing worth showing. Different from pending and says so. */
  | { state: 'empty' }
  /** The profile or job has no embedding: too sparse to match, or ingest has not run. */
  | { state: 'too-sparse' };

/**
 * A job's ranked candidates, for its owner.
 *
 * Only the reason crosses the boundary. The score stays in `match_cache`, which has no
 * `authenticated` policy at all, so even a crafted request cannot read it.
 */
export async function candidatesForJob(jobId: string): Promise<MatchFeed<CandidateMatch>> {
  const service = createServiceClient();

  const { data: job } = await service
    .from('jobs')
    .select('embedding')
    .eq('id', jobId)
    .maybeSingle();
  if (!job?.embedding) return { state: 'too-sparse' };

  const cached = await readCache('job', jobId);
  if (!cached) return { state: 'pending' };
  if (cached.length === 0) return { state: 'empty' };

  const { data: profiles } = await service
    .from('talent_profiles')
    .select('id, slug, headline, portfolio_item_count, website_url, accepts_messages, avatar_url')
    .in(
      'id',
      cached.map((c) => c.targetId),
    )
    .eq('is_published', true);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const matches = cached
    .map((c) => {
      const profile = byId.get(c.targetId);
      // A candidate who unpublished since the ranking was computed is dropped rather than
      // rendered as a broken row. The TTL and invalidation catch up; this is the guard for
      // the window between.
      if (!profile) return null;
      return {
        talentId: profile.id,
        slug: profile.slug,
        headline: profile.headline,
        portfolioItemCount: profile.portfolio_item_count,
        websiteUrl: profile.website_url,
        acceptsMessages: profile.accepts_messages,
        avatarUrl: profile.avatar_url,
        reason: c.reason,
      };
    })
    .filter((m): m is CandidateMatch => m !== null);

  return matches.length > 0 ? { state: 'ready', matches } : { state: 'empty' };
}

/** A developer's ranked jobs, with their own scores. */
export async function matchesForMe(talentId: string): Promise<MatchFeed<TalentMatch>> {
  const service = createServiceClient();

  const { data: profile } = await service
    .from('talent_profiles')
    .select('embedding')
    .eq('id', talentId)
    .maybeSingle();
  if (!profile?.embedding) return { state: 'too-sparse' };

  const cached = await readCache('talent', talentId);
  if (!cached) return { state: 'pending' };
  if (cached.length === 0) return { state: 'empty' };

  /**
   * Read the jobs as the USER, not the service role. The ranking decided which jobs to show;
   * RLS decides which they may see. A job closed since the ranking was computed disappears
   * here, which is the correct outcome and one the service role would have hidden.
   */
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select(
      'id, slug, title, budget_min, budget_max, currency, engagement_type, location_type, status, client_profiles ( company_name )',
    )
    .in(
      'id',
      cached.map((c) => c.targetId),
    )
    .eq('status', 'open')
    .overrideTypes<
      {
        id: string;
        slug: string;
        title: string;
        budget_min: string | null;
        budget_max: string | null;
        currency: string;
        engagement_type: string;
        location_type: string;
        status: string;
        client_profiles: { company_name: string } | null;
      }[]
    >();

  const byId = new Map((jobs ?? []).map((j) => [j.id, j]));

  const matches = cached
    .map((c) => {
      const job = byId.get(c.targetId);
      if (!job) return null;
      return {
        jobId: job.id,
        slug: job.slug,
        title: job.title,
        companyName: job.client_profiles?.company_name ?? null,
        budgetMin: job.budget_min,
        budgetMax: job.budget_max,
        currency: job.currency,
        engagementType: job.engagement_type,
        locationType: job.location_type,
        // Their own score, on their own match. This is the side of the asymmetry that is
        // allowed to see a number.
        score: c.score >= 0 ? c.score : null,
        reason: c.reason,
      };
    })
    .filter((m): m is TalentMatch => m !== null);

  return matches.length > 0 ? { state: 'ready', matches } : { state: 'empty' };
}

/**
 * The threshold below which a match is not worth showing as "strong".
 *
 * 70 is the same number the J5 calibration gate uses, and that is the point: the eval asserts
 * a job with no good candidate produces nothing above 69, so the display threshold and the
 * measured gate cannot drift apart.
 */
export const STRONG_MATCH_SCORE = 70;

/**
 * Order a job's applications by how well each applicant fits, and attach the reason.
 *
 * Applications arrive in the order people happened to apply, which is noise. A client with
 * twenty applications reads the first three; putting the best fit there is most of the value
 * this product claims to add.
 *
 * ORDERING, NEVER A NUMBER. The score decides the sequence and then stays behind
 * — it is not returned, so no component can render it by accident.
 *
 * Applicants with no cached ranking keep their position AFTER the ranked ones, in application
 * order. They are not "worse", they are unmeasured — usually because they applied after the
 * last warm. Sorting them to the bottom as though they scored zero would be a lie told by the
 * sort function.
 */
export async function rankApplicants<T extends { talentId: string }>(
  jobId: string,
  applicants: T[],
): Promise<(T & { reason: string | null; ranked: boolean })[]> {
  if (applicants.length === 0) return [];

  const cached = await readCache('job', jobId);
  if (!cached) {
    return applicants.map((a) => ({ ...a, reason: null, ranked: false }));
  }

  const rank = new Map(cached.map((c, index) => [c.targetId, index]));
  const reasons = new Map(cached.map((c) => [c.targetId, c.reason]));

  return [...applicants]
    .map((a) => ({
      ...a,
      reason: reasons.get(a.talentId) ?? null,
      ranked: rank.has(a.talentId),
    }))
    .sort((a, b) => {
      const ra = rank.get(a.talentId);
      const rb = rank.get(b.talentId);
      if (ra === undefined && rb === undefined) return 0;
      // Unranked go last, preserving their incoming order rather than being scored as zero.
      if (ra === undefined) return 1;
      if (rb === undefined) return -1;
      return ra - rb;
    });
}

/**
 * Developers who fit this job and have NOT applied.
 *
 * The other half of a two-sided market: a client should not have to wait for the right person
 * to find them. Applicants are excluded because they already appear above, and showing
 * someone twice makes the page look broken.
 */
export async function suggestedForJob(
  jobId: string,
  excludeTalentIds: string[],
  limit = 5,
): Promise<MatchFeed<CandidateMatch>> {
  const feed = await candidatesForJob(jobId);
  if (feed.state !== 'ready') return feed;

  const exclude = new Set(excludeTalentIds);
  const matches = feed.matches.filter((m) => !exclude.has(m.talentId)).slice(0, limit);
  return matches.length > 0 ? { state: 'ready', matches } : { state: 'empty' };
}
