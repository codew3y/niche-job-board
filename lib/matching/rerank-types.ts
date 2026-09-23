/**
 * Shared types for re-ranking.
 *
 * Separate from both halves so the pure parser and the server-only caller can agree on a
 * shape without either importing the other's constraints.
 */

export type RerankCandidate = {
  id: string;
  /** The text that was embedded. The model judges the same material the vectors saw. */
  text: string;
  similarity: number;
};

export type RerankedItem = { id: string; score: number; reason: string };

export type RerankResult =
  | { ok: true; items: RerankedItem[] }
  | { ok: false; reason: 'not_configured' | 'api_error' | 'bad_response'; detail?: string };
