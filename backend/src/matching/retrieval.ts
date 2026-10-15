import 'server-only';

import { createServiceClient } from '../supabase/server';
import { toVectorLiteral } from './embeddings';

/**
 * Vector retrieval, with hard filters applied FIRST.
 *
 * Order is the whole point. Filtering after the vector search means the top 20 can
 * be entirely impossible matches — a full-time-only developer for a job that needs occasional
 * work — and the re-ranker then spends its budget scoring candidates that were never viable.
 * Filtering first means every candidate the expensive stage sees is one the user could
 * actually engage.
 *
 * These run through the SERVICE-ROLE client and that is deliberate. `match_cache` has no
 * `authenticated` policy at all, because the score-asymmetry rule makes the numeric score readable by the
 * server and never by the client. Retrieval has to sit on the same side of that line.
 *
 * Caller responsibility: nothing here checks who is asking. The API layer decides what to
 * expose.
 */

export type Candidate = { id: string; similarity: number };

/**
 * Cosine distance in pgvector is `<=>`, and returns 0 (identical) to 2 (opposite).
 * Similarity is `1 - distance`, so higher is better — which is the direction every caller,
 * every score and every piece of UI copy assumes.
 */
const SIMILARITY = (column: string) => `1 - (${column} <=> $1::vector)`;

/** Never score more than this. the original matching design caps the re-ranker at 20 candidates. */
export const RETRIEVAL_LIMIT = 20;

/**
 * Profiles for a job — the client direction.
 *
 * Hard filters: published only, has an embedding, and availability the job can actually use.
 * Rate overlap is deliberately NOT filtered: a developer whose stated range sits above a
 * job's budget is a negotiation, not an impossibility, and filtering it out removes the
 * candidate a client would most want to have seen.
 */
export async function retrieveProfilesForJob(
  jobEmbedding: number[],
  options: { limit?: number; excludeTalentIds?: string[] } = {},
): Promise<Candidate[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('match_talent_for_job', {
    query_embedding: toVectorLiteral(jobEmbedding),
    match_limit: options.limit ?? RETRIEVAL_LIMIT,
    exclude_ids: options.excludeTalentIds ?? [],
  });
  if (error) throw error;
  return (data ?? []) as Candidate[];
}

/**
 * Jobs for a profile — the talent direction.
 *
 * Hard filters: open only, has an embedding, and not already applied to. The last one matters
 * for the feed to be useful — a match list that keeps recommending jobs you already applied
 * to reads as broken even though every row is a genuine match.
 */
export async function retrieveJobsForProfile(
  profileEmbedding: number[],
  talentId: string,
  options: { limit?: number } = {},
): Promise<Candidate[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc('match_jobs_for_talent', {
    query_embedding: toVectorLiteral(profileEmbedding),
    for_talent: talentId,
    match_limit: options.limit ?? RETRIEVAL_LIMIT,
  });
  if (error) throw error;
  return (data ?? []) as Candidate[];
}

export { SIMILARITY };
