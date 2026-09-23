import 'server-only';

import { GoogleGenAI } from '@google/genai';

import { serverEnv } from '../env';
import { RERANK_MODEL } from './config';
import { parseRerank } from './rerank-parse';
import { RERANK_RESPONSE_SCHEMA, buildRerankPrompt } from './rerank-prompt';
import type { RerankCandidate, RerankResult } from './rerank-types';

/**
 * Re-ranking — which exists to CALIBRATE, not to reorder.
 *
 * That brief comes from measurement, not assumption. Running the hand-labelled set on vector
 * similarity alone scored nDCG@5 1.000, nDCG@3 0.979 and precision@1 1.000 — ordering is
 * already right, including the distractor case the eval exists to catch. The one gate it
 * failed was calibration: J5 has no good match by construction, and raw cosine rated its best
 * candidate 78 out of 100.
 *
 * That is not a flaw in the embedding. Cosine similarity between any two pieces of English
 * prose about software is high in absolute terms, so the NUMBER means nothing on its own even
 * where the ORDER is perfect. A user reading "78% match" on a job that does not fit learns to
 * distrust every number the product shows them.
 *
 * So this asks for one thing the vectors cannot provide: an honest judgement of whether a
 * candidate actually fits, including the answer "no, and here is why not".
 *
 * GRACEFUL FALLBACK IS MANDATORY (ADR-002). If the model is unavailable, rate-limited or
 * returns something unparseable, callers fall back to the vector ordering with scores marked
 * uncalibrated. Matching degrades to "correctly ordered, no numbers" — which is exactly what
 * ADR-007 D2 shows a client anyway.
 */

export type { RerankCandidate, RerankedItem, RerankResult } from './rerank-types';
export { fallbackRanking, parseRerank } from './rerank-parse';

/** ADR-002 caps the re-ranker at 20 candidates. */
export const RERANK_LIMIT = 20;

let client: GoogleGenAI | null = null;
function genai(apiKey: string) {
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export async function rerank(
  brief: string,
  candidates: RerankCandidate[],
  options: { signal?: AbortSignal } = {},
): Promise<RerankResult> {
  const { GEMINI_API_KEY } = serverEnv();
  if (!GEMINI_API_KEY) return { ok: false, reason: 'not_configured' };
  if (candidates.length === 0) return { ok: true, items: [] };

  const capped = candidates.slice(0, RERANK_LIMIT);

  // Same builder the eval uses, so the prompt measured is the prompt shipped.
  const prompt = buildRerankPrompt(brief, capped);

  let text: string;
  try {
    const response = await genai(GEMINI_API_KEY).models.generateContent({
      model: RERANK_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: RERANK_RESPONSE_SCHEMA,
        // Near-zero so the same brief and candidates produce the same scores. A re-rank that
        // moves between page loads is one users cannot trust or reason about.
        temperature: 0,
        ...(options.signal ? { abortSignal: options.signal } : {}),
      },
    });
    text = response.text ?? '';
  } catch (cause) {
    return {
      ok: false,
      reason: 'api_error',
      detail: cause instanceof Error ? cause.message.slice(0, 300) : String(cause),
    };
  }

  return parseRerank(text, capped);
}
