import 'server-only';

import { serverEnv } from '../env';

/**
 * Embedding client — OpenAI `text-embedding-3-small`, 1536 dimensions.
 *
 * Not a choice this file can revisit: ADR-002 froze the dimension into `vector(1536)` on four
 * tables, so a different model means a migration and a full re-embed, not a config change.
 *
 * NEVER CALLED IN A REQUEST PATH. Embedding is ingest-side work (ADR-002), triggered when a
 * profile, item or job is written. A page that embeds on read inherits the API's latency and
 * its outages, and the §11 budget of 800ms p95 does not survive a cold call to a third party.
 *
 * Raw fetch rather than the OpenAI SDK: this is one POST to one endpoint. A dependency would
 * be more bytes and more surface than the twenty lines it replaces.
 */

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

const ENDPOINT = 'https://api.openai.com/v1/embeddings';

export type EmbedFailure = 'not_configured' | 'rate_limited' | 'api_error' | 'bad_response';

export type EmbedResult =
  | { ok: true; embedding: number[]; tokens: number }
  | { ok: false; reason: EmbedFailure; detail?: string; retryable: boolean };

/**
 * Which failures are worth retrying.
 *
 * 429 and 5xx are transient and belong in a backoff loop. A 400 means the input is wrong and
 * will be wrong every time — retrying it burns quota and delays the dead-letter row that would
 * actually tell someone. 401 is a missing or revoked key: also permanent, also not worth
 * hammering.
 */
function classify(status: number): { reason: EmbedFailure; retryable: boolean } {
  if (status === 429) return { reason: 'rate_limited', retryable: true };
  if (status >= 500) return { reason: 'api_error', retryable: true };
  return { reason: 'api_error', retryable: false };
}

export async function embed(text: string, signal?: AbortSignal): Promise<EmbedResult> {
  const { OPENAI_API_KEY } = serverEnv();
  if (!OPENAI_API_KEY) return { ok: false, reason: 'not_configured', retryable: false };

  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
      signal,
    });
  } catch (cause) {
    // A network failure or an abort. Retryable — it says nothing about the input.
    return {
      ok: false,
      reason: 'api_error',
      detail: cause instanceof Error ? cause.message : String(cause),
      retryable: true,
    };
  }

  if (!response.ok) {
    const { reason, retryable } = classify(response.status);
    // The body carries the reason a 400 was a 400, which is what a dead-letter row needs.
    const detail = await response.text().catch(() => '');
    return { ok: false, reason, detail: `${response.status}: ${detail.slice(0, 300)}`, retryable };
  }

  const body = (await response.json().catch(() => null)) as {
    data?: { embedding?: number[] }[];
    usage?: { total_tokens?: number };
  } | null;

  const embedding = body?.data?.[0]?.embedding;
  /**
   * Verify the dimension rather than trusting it. A vector of the wrong length is rejected by
   * Postgres with a type error at insert time, far from the cause — and if the model ever
   * changed under us, silently storing 3072 floats in a vector(1536) column is the failure
   * that would take longest to understand.
   */
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    return {
      ok: false,
      reason: 'bad_response',
      detail: `expected ${EMBEDDING_DIMENSIONS} dimensions, got ${embedding?.length ?? 'none'}`,
      retryable: false,
    };
  }

  return { ok: true, embedding, tokens: body?.usage?.total_tokens ?? 0 };
}

/** pgvector's text input format — `[0.1,0.2,…]`. */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}
