-- CONTRACT STEP for 0020. Drops the columns the new code stopped using:
--   portfolio_items.repo_url, portfolio_items.live_url  (replaced by portfolio_items.links)
--   client_profiles.company_size                         (removed from the product)
--
-- NOT YET REGISTERED, ON PURPOSE. It lives outside lib/db/migrations/ so `npm run db:migrate`
-- cannot apply it early: the code live in production before this change still reads these
-- columns, and dropping them under it would break portfolio saves, public profiles and the
-- client profile page.
--
-- WHEN: after the code that shipped with 0020 is deployed to production and verified.
-- HOW:
--   1. Take a Supabase backup (docs/deploy.md: a dropped column is NOT reversible).
--   2. Move this file to lib/db/migrations/ and add its entry to meta/_journal.json
--      (idx 28, tag "0028_drop_legacy_columns"). It was renumbered from 0021 as 0021-0027
--      (connected accounts, certifications, resume import, rate limits, photos, write guards, auth
--      rate limits) took those numbers;
--      0020's header still says 0021, and an applied migration is not edited.
--   3. Apply with the docs/deploy.md procedure (preflight, read, apply, verify).
--
-- ROLLBACK: none short of restoring the backup. Re-adding the columns empty is possible
-- (ALTER TABLE ... ADD COLUMN repo_url text, ...) but the dropped values are gone.

-- Catch any project the old code wrote between 0020 and the deploy: its links are still only in
-- the old columns. Merged, deduplicated, in a stable order.
UPDATE "portfolio_items" p
SET "links" = (
  SELECT coalesce(array_agg(DISTINCT u ORDER BY u), '{}'::text[])
  FROM unnest(p."links" || array_remove(ARRAY[p."repo_url", p."live_url"], NULL)) AS u
)
WHERE p."repo_url" IS NOT NULL OR p."live_url" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "portfolio_items" DROP CONSTRAINT IF EXISTS "item_urls_https";--> statement-breakpoint
ALTER TABLE "portfolio_items" DROP COLUMN IF EXISTS "repo_url";--> statement-breakpoint
ALTER TABLE "portfolio_items" DROP COLUMN IF EXISTS "live_url";--> statement-breakpoint

-- Dropped rather than left unused. Nothing reads it: not matching, not search, not email, not
-- any SQL function (checked). A column nobody writes is a column somebody later assumes is
-- populated.
ALTER TABLE "client_profiles" DROP COLUMN IF EXISTS "company_size";
