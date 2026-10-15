/**
 * Pure parsing and fallback for re-ranking — deliberately NOT behind `server-only`.
 *
 * `backend/src/matching/rerank.ts` holds the API key and must stay server-only. This half holds no
 * secrets and is the part worth testing hardest, so it lives where a plain Node test runner
 * can import it. Same split, and same reason, as backend/src/matching/config.ts.
 */

import type { RerankCandidate, RerankedItem, RerankResult } from './rerank-types';

/**
 * Parse and VALIDATE the response.
 *
 * A structured-output schema constrains shape, not content: the model can still return an id
 * that was never sent, omit half the candidates, or score 150. Every one of those is silently
 * wrong if trusted — a hallucinated id would surface a profile that was never a candidate.
 *
 * Exported for tests, which is the only way to cover the malformed cases without asking a
 * remote model to misbehave on demand.
 */
export function parseRerank(raw: string, candidates: RerankCandidate[]): RerankResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: 'bad_response', detail: 'not JSON' };
  }

  const rows = (parsed as { candidates?: unknown })?.candidates;
  if (!Array.isArray(rows))
    return { ok: false, reason: 'bad_response', detail: 'no candidates array' };

  const known = new Map(candidates.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const items: RerankedItem[] = [];

  for (const row of rows) {
    const r = row as { id?: unknown; score?: unknown; reason?: unknown };
    if (typeof r.id !== 'string' || !known.has(r.id)) continue; // hallucinated or duplicate id
    if (seen.has(r.id)) continue;
    const score = Number(r.score);
    if (!Number.isFinite(score)) continue;
    seen.add(r.id);
    items.push({
      // Clamp rather than reject: an out-of-range score is a formatting slip, and the
      // ordering it implies is still information worth keeping.
      score: Math.max(0, Math.min(100, Math.round(score))),
      id: r.id,
      reason: typeof r.reason === 'string' ? r.reason.trim() : '',
    });
  }

  /**
   * A partial answer is not an answer. If the model skipped candidates, the ones it did score
   * cannot be compared against the ones it did not, and a feed built from half a ranking is
   * wrong in a way nobody can see. Fall back to the vector ordering instead.
   */
  if (items.length !== candidates.length) {
    return {
      ok: false,
      reason: 'bad_response',
      detail: `scored ${items.length} of ${candidates.length} candidates`,
    };
  }

  return { ok: true, items: items.sort((a, b) => b.score - a.score) };
}

/**
 * The fallback ranking: vector order, with scores marked uncalibrated.
 *
 * Deliberately NOT `similarity * 100`. That is the exact number the eval showed to be
 * meaningless — it rated a WooCommerce developer 80 for a Stripe brief. Callers get the order
 * and are told the scores cannot be trusted, so the UI can show a ranking without a number.
 */
export function fallbackRanking(candidates: RerankCandidate[]): RerankedItem[] {
  return [...candidates]
    .sort((a, b) => b.similarity - a.similarity)
    .map((c) => ({ id: c.id, score: -1, reason: '' }));
}
