import 'server-only';

import { createServiceClient } from '../supabase/server';
import { withRetry } from './backoff';
import { embed, toVectorLiteral } from './embeddings';
import { isEmbeddable, jobToText, talentToText, type JobForText, type TalentForText } from './text';

/**
 * Ingest: turn a row into a vector and store it.
 *
 * ASYNC, NEVER IN A REQUEST PATH (ADR-002). A page that embeds on read inherits the API's
 * latency and its outages, and the 800ms p95 budget does not survive a cold third-party call.
 * Callers hand work to `embedInBackground` and return immediately.
 *
 * Every permanent failure lands in `embedding_failures`. That table is the difference between
 * "matching is quietly worse than it should be" and a row that names the entity and the
 * reason — a dead letter nobody writes is an outage nobody notices.
 */

export type EntityType = 'talent_profile' | 'portfolio_item' | 'job';

export type IngestResult = { ok: true; skipped?: 'not_embeddable' } | { ok: false; reason: string };

/**
 * Embed one entity and write the vector.
 *
 * Text is built here rather than passed in, so the stored vector always corresponds to the
 * current row. Accepting pre-built text would let a caller embed a stale copy and stamp
 * `embedding_updated_at` as though it were fresh.
 */
export async function embedEntity(type: EntityType, id: string): Promise<IngestResult> {
  const supabase = createServiceClient();

  const text = await buildText(type, id);
  if (text === null) return { ok: false, reason: 'entity not found' };

  /**
   * A headline with nothing behind it embeds to a vector that is confidently wrong: it sits
   * somewhere in the space and will be nearest to SOMETHING. Better to store no vector and let
   * retrieval skip the row — the match feed then says "too sparse to match" instead of
   * offering a ranking built on nothing. Not a publish gate; ADR-008 removed all of those.
   */
  if (!isEmbeddable(text)) {
    await clearEmbedding(type, id);
    return { ok: true, skipped: 'not_embeddable' };
  }

  const run = await withRetry(async () => {
    const result = await embed(text);
    if (result.ok) return { ok: true as const, value: result.embedding };
    return {
      ok: false as const,
      retryable: result.retryable,
      detail: `${result.reason}: ${result.detail ?? ''}`,
    };
  });

  if (!run.ok) {
    await recordFailure(type, id, run.detail ?? 'unknown', run.attempts);
    return { ok: false, reason: run.detail ?? 'unknown' };
  }

  const { error } = await supabase
    .from(tableFor(type))
    .update({
      embedding: toVectorLiteral(run.value),
      embedding_updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    await recordFailure(type, id, `write failed: ${error.message}`, run.attempts);
    return { ok: false, reason: error.message };
  }

  // Success clears any previous dead letter, so the table only ever holds things still broken.
  await supabase.from('embedding_failures').delete().eq('entity_type', type).eq('entity_id', id);
  return { ok: true };
}

/**
 * Queue an embed without making the caller wait or handle the outcome.
 *
 * Same rule as email (lib/email/send.ts): ingest must never fail the action that triggered it.
 * Saving a profile succeeds whether or not the embedding does — the profile is the user's
 * work, the vector is our convenience.
 *
 * This is in-process, which is honest about what it is: a real queue survives a deploy and
 * this does not. On Vercel a function can be frozen after the response, so a send may not
 * finish. The backfill is the safety net — anything missed is picked up by
 * `npm run embed:backfill`, which is also why that script exists rather than being a one-off.
 */
export function embedInBackground(type: EntityType, id: string): void {
  void embedEntity(type, id).catch((cause: unknown) => {
    console.error(`[ingest] ${type} ${id} escaped embedEntity: ${String(cause)}`);
  });
}

function tableFor(type: EntityType): string {
  return type === 'talent_profile'
    ? 'talent_profiles'
    : type === 'portfolio_item'
      ? 'portfolio_items'
      : 'jobs';
}

async function clearEmbedding(type: EntityType, id: string): Promise<void> {
  // NULL rather than leaving a stale vector. A profile edited down to nothing must stop
  // matching on what it used to say.
  await createServiceClient()
    .from(tableFor(type))
    .update({ embedding: null, embedding_updated_at: null })
    .eq('id', id);
}

async function recordFailure(
  type: EntityType,
  id: string,
  detail: string,
  attempts: number,
): Promise<void> {
  const supabase = createServiceClient();
  // Upsert on the unique (entity_type, entity_id): one row per broken entity, with a count,
  // rather than a new row per attempt. A dead-letter table that grows per retry is a log.
  await supabase.from('embedding_failures').upsert(
    {
      entity_type: type,
      entity_id: id,
      attempts,
      last_error: detail.slice(0, 500),
      last_failed_at: new Date().toISOString(),
    },
    { onConflict: 'entity_type,entity_id' },
  );
}

/** Build the text for an entity from its current row. Returns null if the row is gone. */
async function buildText(type: EntityType, id: string): Promise<string | null> {
  const supabase = createServiceClient();

  if (type === 'talent_profile') {
    const { data } = await supabase
      .from('talent_profiles')
      .select(
        `headline, bio, availability, years_experience, timezone,
         talent_skills ( proficiency, years, skills ( name ) ),
         portfolio_items ( title, description, role, outcome, tech_stack ),
         talent_certifications ( name, issuer )`,
      )
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<{
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
      }>();
    if (!data) return null;

    const input: TalentForText = {
      headline: data.headline,
      bio: data.bio,
      availability: data.availability,
      yearsExperience: data.years_experience,
      timezone: data.timezone,
      skills: (data.talent_skills ?? [])
        .filter((s) => s.skills)
        .map((s) => ({ name: s.skills!.name, proficiency: s.proficiency, years: s.years })),
      items: (data.portfolio_items ?? []).map((i) => ({
        title: i.title,
        description: i.description,
        role: i.role,
        outcome: i.outcome,
        // Supabase types a text[] column loosely; the column is text[] NOT NULL by schema.
        techStack: (i.tech_stack ?? []) as string[],
      })),
      certifications: data.talent_certifications ?? [],
    };
    return talentToText(input);
  }

  if (type === 'job') {
    const { data } = await supabase
      .from('jobs')
      .select(
        `title, description, requirements, responsibilities, engagement_type, location_type,
         experience_level, job_skills ( is_required, skills ( name ) )`,
      )
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<{
        title: string;
        description: string;
        requirements: string | null;
        responsibilities: string | null;
        engagement_type: string | null;
        location_type: string | null;
        experience_level: string | null;
        job_skills: { is_required: boolean; skills: { name: string } | null }[];
      }>();
    if (!data) return null;

    const input: JobForText = {
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      responsibilities: data.responsibilities,
      engagementType: data.engagement_type,
      locationType: data.location_type,
      experienceLevel: data.experience_level,
      skills: (data.job_skills ?? [])
        .filter((s) => s.skills)
        .map((s) => ({ name: s.skills!.name, isRequired: s.is_required })),
    };
    return jobToText(input);
  }

  const { data } = await supabase
    .from('portfolio_items')
    .select('title, description, role, outcome, tech_stack')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;

  const { itemToText } = await import('./text');
  return itemToText({
    title: data.title,
    description: data.description,
    role: data.role,
    outcome: data.outcome,
    techStack: (data.tech_stack ?? []) as string[],
  });
}
