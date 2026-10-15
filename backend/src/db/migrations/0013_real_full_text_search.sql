-- Real full-text search, on both sides.
--
-- What was here before: an expression index, `jobs_fts_idx`, over
-- to_tsvector('english', title || description || requirements) — and NOTHING that queried it.
-- lib/services/jobs.ts ran `title.ilike.%q%,description.ilike.%q%` under a comment claiming
-- websearch syntax. The index was dead weight, the comment described code that did not exist,
-- and talent search never had even that.
--
-- Substring matching is not search. `React developer` matched only that literal string: not
-- "React" in the headline and "developer" in the bio, no stemming (develop/developer/
-- developing), no ranking, and no way to express "stripe but not shopify". It looked like
-- search, which is why nobody filed it as a bug.
--
-- A GENERATED column rather than an expression index, because PostgREST can only apply
-- textSearch to a real column. That is what made the previous index unusable from the
-- application even if someone had tried.
--
-- setweight puts the title/headline above the body. Without it, a job whose description
-- mentions Stripe in passing ranks level with one whose title is "Stripe integration".

ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("requirements", '')), 'C')
  ) STORED;--> statement-breakpoint

-- The old expression index can go: it indexed an expression nothing queries, and the new
-- column covers the same text.
DROP INDEX IF EXISTS "jobs_fts_idx";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING gin ("search_vector");--> statement-breakpoint

-- Talent gets the same treatment. Headline carries the most weight, then the bio — which is
-- the substantive text the publish gate exists to guarantee, and the only first-party prose
-- the matching layer will have to read in Phase 4.
ALTER TABLE "talent_profiles" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("headline", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("bio", '')), 'B')
  ) STORED;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "talent_search_idx" ON "talent_profiles" USING gin ("search_vector");
