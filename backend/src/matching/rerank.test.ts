/**
 * Re-rank response parsing.
 *
 * A structured-output schema constrains SHAPE, not CONTENT. The model can still return an id
 * that was never sent, skip half the candidates, or score 150 — and every one of those is
 * silently wrong if trusted. These cases cannot be produced by asking a remote model to
 * misbehave on demand, so the parser is exported and tested directly.
 */

import { describe, expect, it } from 'vitest';

import { fallbackRanking, parseRerank } from './rerank-parse';
import type { RerankCandidate } from './rerank-types';

const candidates: RerankCandidate[] = [
  { id: 'a', text: 'Payments developer', similarity: 0.9 },
  { id: 'b', text: 'Frontend developer', similarity: 0.7 },
];

const body = (rows: unknown) => JSON.stringify({ candidates: rows });

describe('parseRerank', () => {
  it('accepts a complete, well-formed answer and sorts by score', () => {
    const result = parseRerank(
      body([
        { id: 'b', score: 40, reason: 'Adjacent work.' },
        { id: 'a', score: 90, reason: 'Has shipped exactly this.' },
      ]),
      candidates,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('DROPS A HALLUCINATED ID', () => {
    // An id that was never sent would surface a profile that was never a candidate.
    const result = parseRerank(
      body([
        { id: 'a', score: 90, reason: 'x' },
        { id: 'b', score: 50, reason: 'y' },
        { id: 'ghost', score: 99, reason: 'invented' },
      ]),
      candidates,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('FALLS BACK WHEN THE MODEL SCORES ONLY SOME CANDIDATES', () => {
    // A partial answer is not an answer: scored and unscored candidates cannot be compared,
    // so a feed built from half a ranking is wrong in a way nobody can see.
    const result = parseRerank(body([{ id: 'a', score: 90, reason: 'x' }]), candidates);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.detail).toMatch(/scored 1 of 2/);
  });

  it('clamps an out-of-range score rather than discarding the judgement', () => {
    const result = parseRerank(
      body([
        { id: 'a', score: 150, reason: 'x' },
        { id: 'b', score: -20, reason: 'y' },
      ]),
      candidates,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.find((i) => i.id === 'a')!.score).toBe(100);
    expect(result.items.find((i) => i.id === 'b')!.score).toBe(0);
  });

  it('ignores a duplicated id rather than counting it twice', () => {
    const result = parseRerank(
      body([
        { id: 'a', score: 90, reason: 'x' },
        { id: 'a', score: 10, reason: 'again' },
        { id: 'b', score: 50, reason: 'y' },
      ]),
      candidates,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.find((i) => i.id === 'a')!.score).toBe(90);
  });

  it('rejects text that is not JSON at all', () => {
    const result = parseRerank('I think candidate A is best!', candidates);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('bad_response');
  });

  it('rejects JSON without a candidates array', () => {
    expect(parseRerank(JSON.stringify({ result: 'ok' }), candidates).ok).toBe(false);
  });

  it('skips a row whose score is not a number', () => {
    const result = parseRerank(
      body([
        { id: 'a', score: 'high', reason: 'x' },
        { id: 'b', score: 50, reason: 'y' },
      ]),
      candidates,
    );
    // One of two scored — a partial answer, so it falls back rather than half-ranking.
    expect(result.ok).toBe(false);
  });

  it('tolerates a missing reason without losing the score', () => {
    const result = parseRerank(
      body([
        { id: 'a', score: 90 },
        { id: 'b', score: 50, reason: 'y' },
      ]),
      candidates,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.find((i) => i.id === 'a')!.reason).toBe('');
  });
});

describe('fallbackRanking', () => {
  it('preserves vector order', () => {
    expect(fallbackRanking(candidates).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('MARKS SCORES AS UNCALIBRATED RATHER THAN SCALING SIMILARITY', () => {
    // similarity * 100 is the exact number the eval proved meaningless — it rated a
    // WooCommerce developer 80 for a Stripe brief. -1 forces callers to show a ranking
    // without a number instead of showing a confident wrong one.
    for (const item of fallbackRanking(candidates)) {
      expect(item.score).toBe(-1);
    }
  });

  it('handles an empty candidate list', () => {
    expect(fallbackRanking([])).toEqual([]);
  });
});
