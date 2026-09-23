import 'server-only';

import { createServiceClient } from '../supabase/server';
import type { RerankedItem } from './rerank-types';

/**
 * `match_cache` — read-through cache for re-ranked results.
 *
 * Re-ranking costs an API call and about a second. Doing it per page view would put a
 * third-party round trip inside the 800ms p95 budget and burn free-tier quota on a result that
 * has not changed. ADR-002 caches it with a TTL; this is that.
 *
 * NO `authenticated` POLICY EXISTS ON THIS TABLE, deliberately (ADR-007 D2). It holds numeric
 * scores, and a client must never read one. Every function here uses the service-role client
 * and the API layer decides what to expose — which for a client is ordering and a reason, and
 * never the number.
 */

/**
 * Six hours.
 *
 * The inputs move slowly — profiles and jobs are edited occasionally, not continuously — so a
 * short TTL would spend quota re-deriving the same answer. What a long TTL risks is staleness,
 * and that is handled by explicit invalidation on edit rather than by guessing a short window.
 * The TTL is the backstop for changes invalidation cannot see, such as a NEW candidate
 * appearing who should now rank.
 */
export const TTL_MS = 6 * 60 * 60 * 1000;

export type SubjectType = 'talent' | 'job';

export type CachedMatch = { targetId: string; score: number; reason: string | null };

/**
 * Read a cached ranking, or null if there is none or it has expired.
 *
 * Expiry is checked in the QUERY, not in JavaScript. A row that expired a second ago must not
 * be served because the process clock drifted — and filtering in SQL means the index on
 * `expires_at` does the work.
 */
export async function readCache(
  subjectType: SubjectType,
  subjectId: string,
): Promise<CachedMatch[] | null> {
  const { data, error } = await createServiceClient()
    .from('match_cache')
    .select('target_id, score, reason')
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .gt('expires_at', new Date().toISOString())
    .order('score', { ascending: false });

  if (error || !data || data.length === 0) return null;
  return data.map((r) => ({ targetId: r.target_id, score: r.score, reason: r.reason }));
}

/**
 * Replace the cached ranking for a subject.
 *
 * Delete-then-insert rather than upsert. A new ranking is a complete answer: if the previous
 * one contained a candidate the new one does not — because they unpublished, or were filtered
 * out — an upsert would leave that row behind and it would keep being served. Cached results
 * are replaced wholesale or not at all.
 */
export async function writeCache(
  subjectType: SubjectType,
  subjectId: string,
  items: RerankedItem[],
): Promise<void> {
  const supabase = createServiceClient();
  const expiresAt = new Date(Date.now() + TTL_MS).toISOString();

  await supabase
    .from('match_cache')
    .delete()
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId);

  // An uncalibrated fallback ranking (score -1) is NOT cached. Caching it would freeze a
  // degraded result for six hours because the model happened to be down for one request.
  const rows = items
    .filter((item) => item.score >= 0)
    .map((item) => ({
      subject_type: subjectType,
      subject_id: subjectId,
      target_id: item.id,
      score: item.score,
      reason: item.reason || null,
      expires_at: expiresAt,
    }));

  if (rows.length > 0) await supabase.from('match_cache').insert(rows);
}

/**
 * Drop cached rankings that involve an entity, in BOTH directions.
 *
 * When a job is edited, two things are stale: the ranking OF candidates for that job, and
 * every talent ranking that included it as a target. Invalidating only the first leaves a
 * developer's feed recommending a job on the strength of text that no longer exists.
 *
 * Called on edit and on unpublish. The TTL is the backstop for what this cannot see.
 */
export async function invalidate(entityType: SubjectType, entityId: string): Promise<void> {
  const supabase = createServiceClient();
  await Promise.all([
    // Rankings computed FOR this subject.
    supabase.from('match_cache').delete().eq('subject_type', entityType).eq('subject_id', entityId),
    // Rankings anywhere that list it as a candidate.
    supabase.from('match_cache').delete().eq('target_id', entityId),
  ]);
}

/**
 * Remove expired rows.
 *
 * The TTL check on read means expired rows are never served, so this is housekeeping rather
 * than correctness — but without it the table grows forever on a free-tier 500MB database.
 * Called from the keep-alive, which already runs on a schedule.
 */
export async function sweepExpired(): Promise<number> {
  const { data } = await createServiceClient()
    .from('match_cache')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');
  return data?.length ?? 0;
}
