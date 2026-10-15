import 'server-only';

import { createServiceClient } from '../supabase/server';

/**
 * The hard daily cap on AI calls.
 *
 * On the free tier the scarce resource is REQUESTS, not money — roughly 1,000 embedding
 * requests a day — so the cap counts calls. A paid key would make the same counter answer
 * "what did today cost" by multiplying.
 *
 * WHY A CAP AT ALL, when the provider already has quotas: because hitting a provider's limit
 * is an outage, and hitting your own is a decision. Our limits sit below theirs, so a runaway
 * loop degrades matching for a day rather than taking the whole key down — including the
 * embeddings a signup depends on.
 *
 * RESERVE BEFORE SPENDING. `reserve_ai_call` increments and checks in one statement, so two
 * concurrent callers reading "999 used" cannot both decide there is room. Counting after the
 * call would let a burst pass together and overshoot by exactly the amount of concurrency
 * available.
 */

export type AiCallKind = 'embedding' | 'rerank' | 'resume_import';

/**
 * Daily limits, deliberately under the provider's.
 *
 * Embedding is the one a user can trigger — every profile save queues one — so it gets the
 * larger share. Re-ranking is scheduled and bounded by the warm budget anyway; its cap is a
 * backstop against a loop, not a throttle on normal use.
 *
 * At the current seed size a full re-embed is ~90 calls and a full warm is ~45, so these
 * leave roughly 5x headroom for a normal day.
 */
export const DAILY_LIMITS: Record<AiCallKind, number> = {
  embedding: 500,
  rerank: 200,
  // Resume import (migration 0023): its own site-wide cap, so imports can never use up the
  // matching budget. Each person is also limited per day (backend/src/import/extract.ts).
  resume_import: 100,
};

/**
 * Reserve one call. Returns false when the cap is reached.
 *
 * FAILS OPEN on a database error, and that is a deliberate trade. The cap protects a quota;
 * the database protects the product. If Postgres is unreachable the embed will fail on its
 * own a moment later, and refusing every AI call because the counter is unavailable turns a
 * transient database blip into a matching outage.
 */
export async function reserveCall(kind: AiCallKind): Promise<boolean> {
  try {
    const { data, error } = await createServiceClient().rpc('reserve_ai_call', {
      p_kind: kind,
      p_limit: DAILY_LIMITS[kind],
    });
    if (error) {
      console.warn(`[budget] could not reserve ${kind}: ${error.message}`);
      return true;
    }
    if (data === false) {
      // Loud, because silent degradation of matching is the failure mode this whole file
      // exists to make visible.
      console.error(`[budget] DAILY CAP REACHED for ${kind} (${DAILY_LIMITS[kind]}). Skipping.`);
    }
    return data !== false;
  } catch (cause) {
    console.warn(`[budget] reserve threw for ${kind}: ${String(cause).slice(0, 120)}`);
    return true;
  }
}

export type UsageToday = { kind: AiCallKind; calls: number; limit: number; remaining: number }[];

/** What has been spent today. Surfaced by /api/health so a cap is visible before it bites. */
export async function usageToday(): Promise<UsageToday> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await createServiceClient()
    .from('ai_usage')
    .select('kind, calls')
    .eq('day', today);

  const used = new Map((data ?? []).map((r) => [r.kind as AiCallKind, r.calls as number]));
  return (Object.keys(DAILY_LIMITS) as AiCallKind[]).map((kind) => {
    const calls = used.get(kind) ?? 0;
    return {
      kind,
      calls,
      limit: DAILY_LIMITS[kind],
      remaining: Math.max(0, DAILY_LIMITS[kind] - calls),
    };
  });
}
