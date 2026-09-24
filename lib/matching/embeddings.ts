import 'server-only';

import { GoogleGenAI } from '@google/genai';

import { serverEnv } from '../env';
import { reserveCall } from './budget';
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_TASK_TYPE } from './config';

export { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from './config';

/**
 * Embedding client — Gemini `gemini-embedding-2` at 1536 dimensions.
 *
 * ADR-002 originally froze OpenAI's `text-embedding-3-small`; ADR-009 replaces it with Gemini
 * on the free tier (owner decision, 2026-09-23). The schema is untouched because
 * `gemini-embedding-2` accepts a configurable `outputDimensionality` and 1536 is one of its
 * recommended sizes — so `vector(1536)` and every HNSW index survive the swap.
 *
 * WHAT DOES NOT SURVIVE IS ANY EXISTING EMBEDDING. Vectors from two different models are not
 * comparable: cosine distance between an OpenAI vector and a Gemini one is a number with no
 * meaning, and mixing them silently produces confident nonsense rather than an error. Anything
 * already embedded has to be re-embedded, which is why the backfill clears before it writes.
 *
 * NEVER CALLED IN A REQUEST PATH. Embedding is ingest-side work: a page that embeds on read
 * inherits the API's latency and its outages, and the 800ms p95 budget does not survive a cold
 * call to a third party.
 */

export type EmbedFailure = 'not_configured' | 'rate_limited' | 'api_error' | 'bad_response';

export type EmbedResult =
  | { ok: true; embedding: number[] }
  | { ok: false; reason: EmbedFailure; detail?: string; retryable: boolean };

let client: GoogleGenAI | null = null;

function genai(apiKey: string): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/**
 * Which failures are worth retrying.
 *
 * 429 and 5xx are transient and belong in a backoff loop. A 400 means the input is wrong and
 * will be wrong every time — retrying burns free-tier quota, which is the scarce resource
 * here, and delays the dead-letter row that would actually tell someone.
 */
function classify(message: string): { reason: EmbedFailure; retryable: boolean } {
  if (/\b429\b|rate.?limit|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return { reason: 'rate_limited', retryable: true };
  }
  if (/\b5\d\d\b|UNAVAILABLE|INTERNAL|DEADLINE/i.test(message)) {
    return { reason: 'api_error', retryable: true };
  }
  if (/\b401\b|\b403\b|API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return { reason: 'api_error', retryable: false };
  }
  return { reason: 'api_error', retryable: false };
}

export async function embed(text: string, signal?: AbortSignal): Promise<EmbedResult> {
  const { GEMINI_API_KEY } = serverEnv();
  if (!GEMINI_API_KEY) return { ok: false, reason: 'not_configured', retryable: false };

  /**
   * Reserved BEFORE the call. Not retryable: the cap will still be reached on the next
   * attempt, and retrying would spend the backoff loop discovering that repeatedly.
   */
  if (!(await reserveCall('embedding'))) {
    return { ok: false, reason: 'rate_limited', detail: 'daily cap reached', retryable: false };
  }

  try {
    const response = await genai(GEMINI_API_KEY).models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: EMBEDDING_TASK_TYPE,
        ...(signal ? { abortSignal: signal } : {}),
      },
    });

    const values = response.embeddings?.[0]?.values;

    /**
     * Verify the dimension rather than trusting it. The model defaults to 3072 and only
     * returns 1536 because `outputDimensionality` asked; if that option were ever ignored,
     * Postgres would reject the insert far from the cause, and a silent mismatch would be the
     * hardest failure here to understand.
     */
    if (!Array.isArray(values) || values.length !== EMBEDDING_DIMENSIONS) {
      return {
        ok: false,
        reason: 'bad_response',
        detail: `expected ${EMBEDDING_DIMENSIONS} dimensions, got ${values?.length ?? 'none'}`,
        retryable: false,
      };
    }

    return { ok: true, embedding: normalize(values) };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const { reason, retryable } = classify(detail);
    return { ok: false, reason, detail: detail.slice(0, 300), retryable };
  }
}

/**
 * Scale to unit length.
 *
 * These models are trained with Matryoshka representation learning, so asking for 1536
 * dimensions truncates a 3072-wide vector rather than producing a natively 1536-wide one, and
 * truncation costs the unit length the full vector had.
 *
 * MEASURED, not assumed: at 1536 dimensions `gemini-embedding-2` comes back with magnitude
 * 1.0000 — Google renormalises server-side — while `gemini-embedding-001` comes back at
 * 0.6932 and does not. So this is a no-op for the model in use and load-bearing for the older
 * one, which is exactly why it belongs at the boundary: the rest of the pipeline gets the same
 * guarantee whichever model answers.
 *
 * Cosine distance — what `vector_cosine_ops` uses — is scale-invariant, so this changes no
 * ranking today either way. It matters the moment anything touches inner product or L2, where
 * an unnormalised vector silently biases toward longer texts.
 */
function normalize(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  // A zero vector cannot be normalised; returning it unchanged is better than NaNs.
  if (magnitude === 0) return values;
  return values.map((v) => v / magnitude);
}

/** pgvector's text input format — `[0.1,0.2,…]`. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
