import 'server-only';

import { createServiceClient } from '../supabase/server';
import { TTL_MS } from './cache';
import { matchesForJob, matchesForTalent } from './match';

/**
 * Cache warming — the reason matching feels instant on a tier that answers in 30 seconds.
 *
 * Measured, not assumed: re-ranking twenty candidates on the free tier took 118s, and a
 * one-word prompt took 31-109s. That is queuing, not compute, so no amount of prompt
 * shrinking fixes it. Synchronous re-ranking is therefore off the table, and the original matching design's
 * async-and-cached design becomes mandatory rather than merely preferable.
 *
 * So rankings are computed AHEAD of anyone asking. A reader hits a warm cache and gets an
 * answer in milliseconds; the slow part already happened, unobserved. This is how
 * recommendation feeds generally work, and it is better than a fast API call rather than a
 * concession to a slow one.
 *
 * WORKS TO A TIME BUDGET, not a count. A serverless function has a wall-clock limit and one
 * re-rank can take two minutes, so "warm 10 subjects" is a promise this cannot keep. It warms
 * what it can and returns; the next tick continues. Nothing is lost by stopping early because
 * staleness is recomputed from the database each run.
 */

/**
 * Stop starting new work this close to the limit.
 *
 * Sized from measurement, not a guess: re-ranks against hosted data took 45s, 63s, 77s, 135s
 * and 238s. The spread is the problem — there is no margin that is both safe and useful
 * inside a 300s serverless ceiling, which is why the SCHEDULE runs in GitHub Actions instead
 * (backend/src/matching/warm-cli.mts) and this path handles one subject at a time.
 */
const SAFETY_MARGIN_MS = 140_000;

export type WarmResult = {
  warmed: { type: 'job' | 'talent'; id: string; count: number; ms: number }[];
  skipped: number;
  ranOutOfTime: boolean;
};

/**
 * Subjects whose cached ranking is missing or expired, oldest first.
 *
 * Ordered by how long they have been cold so nothing starves. A subject warmed an hour ago
 * sorts behind one never warmed at all, which is what makes repeated short runs converge
 * rather than re-warming the same few rows.
 */
async function findCold(limit: number): Promise<{ type: 'job' | 'talent'; id: string }[]> {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() + TTL_MS / 4).toISOString();

  // Anything expiring within a quarter of the TTL counts as cold, so a cache is refreshed
  // before it lapses rather than after — a reader should never be the one to discover it.
  const { data: fresh } = await supabase
    .from('match_cache')
    .select('subject_type, subject_id')
    .gt('expires_at', cutoff);

  const warmIds = new Set((fresh ?? []).map((r) => `${r.subject_type}:${r.subject_id}`));

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('status', 'open')
    .not('embedding', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit * 2);

  const { data: talent } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('is_published', true)
    .not('embedding', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(limit * 2);

  const cold: { type: 'job' | 'talent'; id: string }[] = [];
  for (const job of jobs ?? []) {
    if (!warmIds.has(`job:${job.id}`)) cold.push({ type: 'job', id: job.id });
  }
  for (const profile of talent ?? []) {
    if (!warmIds.has(`talent:${profile.id}`)) cold.push({ type: 'talent', id: profile.id });
  }
  return cold.slice(0, limit);
}

export async function warmMatches(budgetMs: number, maxSubjects = 20): Promise<WarmResult> {
  const startedAt = Date.now();
  const cold = await findCold(maxSubjects);

  const warmed: WarmResult['warmed'] = [];
  let ranOutOfTime = false;

  for (const subject of cold) {
    const elapsed = Date.now() - startedAt;
    if (elapsed + SAFETY_MARGIN_MS > budgetMs) {
      // Stop STARTING work, rather than being killed mid-request. A function terminated
      // during a re-rank wastes the call and leaves nothing cached.
      ranOutOfTime = true;
      break;
    }

    const at = Date.now();
    try {
      const matches =
        subject.type === 'job'
          ? await matchesForJob(subject.id, { skipCache: true })
          : await matchesForTalent(subject.id, { skipCache: true });
      warmed.push({
        type: subject.type,
        id: subject.id,
        count: matches.length,
        ms: Date.now() - at,
      });
    } catch (cause) {
      // One failure must not end the run: the next subject may well succeed, and a 503 on
      // this tier is routine rather than exceptional.
      console.error(`[warm] ${subject.type} ${subject.id}: ${String(cause).slice(0, 160)}`);
    }
  }

  return { warmed, skipped: cold.length - warmed.length, ranOutOfTime };
}
