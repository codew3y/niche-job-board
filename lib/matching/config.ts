/**
 * Matching constants, deliberately in a module with NO `server-only` import.
 *
 * `lib/matching/embeddings.ts` is server-only and must stay that way — it holds the API key.
 * But the eval CLI and the backfill script are plain Node, and importing a `server-only`
 * module from them fails to resolve. Keeping the shared facts here means the eval measures the
 * same model and dimension production writes, rather than a copy that drifts.
 */

/** ADR-009. 1536 is one of gemini-embedding-2's recommended sizes, which is what lets it drop into the existing vector(1536) columns. */
export const EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Symmetric, because matching runs both ways: a job looks for profiles and a profile looks for
 * jobs, so one stored vector has to serve both directions. RETRIEVAL_QUERY/RETRIEVAL_DOCUMENT
 * would need two vectors per row to do the same work.
 */
export const EMBEDDING_TASK_TYPE = 'SEMANTIC_SIMILARITY';
