-- Vector retrieval functions, with hard filters applied BEFORE the similarity search.
--
-- Written as SQL functions rather than assembled in TypeScript for one reason: PostgREST
-- cannot express `ORDER BY embedding <=> $1` at all. Without these, retrieval would mean
-- pulling candidate rows into Node and sorting them there — which defeats the HNSW index,
-- scales with the table rather than the result, and puts a vector comparison in the request
-- path. A function keeps the whole operation inside Postgres, where the index lives.
--
-- SECURITY DEFINER with a pinned search_path. These read every published profile and open job
-- regardless of who asks, which is correct — ranking happens server-side and the score is
-- never exposed to a client (ADR-007 D2). EXECUTE is granted to service_role only, so the
-- anon and authenticated roles cannot call them at all.
--
-- ORDER OF OPERATIONS IS THE POINT (ADR-002): filters first, then ORDER BY distance, then
-- LIMIT. Filtering after the vector search would let the top 20 fill with candidates the user
-- could never engage, and the re-ranker would spend its budget scoring them.

CREATE OR REPLACE FUNCTION public.match_talent_for_job(
  query_embedding vector(1536),
  match_limit int DEFAULT 20,
  exclude_ids uuid[] DEFAULT '{}'
)
RETURNS TABLE (id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT p.id,
         -- pgvector's <=> is cosine DISTANCE (0 identical, 2 opposite). Every caller, score
         -- and piece of UI copy assumes higher-is-better, so invert once, here.
         1 - (p.embedding <=> query_embedding) AS similarity
  FROM talent_profiles p
  WHERE p.is_published = true
    AND p.embedding IS NOT NULL
    -- Someone who marked themselves unavailable is not a candidate. The other three
    -- availabilities are all engageable, and which suits is the client's call.
    AND p.availability <> 'unavailable'
    AND NOT (p.id = ANY(exclude_ids))
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_limit;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.match_talent_for_job(vector, int, uuid[]) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.match_talent_for_job(vector, int, uuid[]) TO service_role;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.match_jobs_for_talent(
  query_embedding vector(1536),
  for_talent uuid,
  match_limit int DEFAULT 20
)
RETURNS TABLE (id uuid, similarity double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT j.id,
         1 - (j.embedding <=> query_embedding) AS similarity
  FROM jobs j
  WHERE j.status = 'open'
    AND j.embedding IS NOT NULL
    -- A closed deadline is a job nobody can apply to, however well it matches.
    AND (j.deadline IS NULL OR j.deadline >= current_date)
    -- Already applied is the filter that decides whether the feed feels alive or broken:
    -- a match list that keeps recommending jobs you have already applied to reads as broken
    -- even though every row in it is a genuine match.
    AND NOT EXISTS (
      SELECT 1 FROM applications a
      WHERE a.job_id = j.id AND a.talent_id = for_talent
    )
  ORDER BY j.embedding <=> query_embedding
  LIMIT match_limit;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.match_jobs_for_talent(vector, uuid, int) FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.match_jobs_for_talent(vector, uuid, int) TO service_role;
