-- Developer profile sections: experience, education, multi-link projects and a dedicated
-- project-media bucket.
--
-- Hand-written, like 0010–0019. Mirrors lib/db/schema/talent.ts; if the two ever disagree, the
-- schema files are the spec and this file is the bug.
--
-- EXPAND ONLY — SAFE TO APPLY BEFORE THE CODE IS DEPLOYED (docs/deploy.md: "apply the migration
-- first, then merge the code"). Nothing is dropped here. The code that replaces them no longer
-- reads portfolio_items.repo_url / live_url or client_profiles.company_size, but the version
-- still live in production does, so those columns are removed by a SEPARATE contract step once
-- the new code is deployed: lib/db/migrations-pending/0021_drop_legacy_columns.sql.
--
-- ROLLBACK (everything here is additive; data written to the new tables/column is lost):
--   DROP TABLE IF EXISTS talent_education, talent_experience;
--   ALTER TABLE portfolio_items DROP CONSTRAINT IF EXISTS item_links_max,
--     DROP CONSTRAINT IF EXISTS item_links_https, DROP COLUMN IF EXISTS links;
--   DROP FUNCTION IF EXISTS public.all_https(text[]);
--   DROP POLICY IF EXISTS project_media_public_read / _insert_own_folder / _update_own_folder /
--     _delete_own_folder ON storage.objects;  -- and empty + delete the 'project-media' bucket
--   then delete this migration's row from drizzle.__drizzle_migrations.

-- ───────────────────────────── helpers ─────────────────────────────

-- A CHECK cannot contain a subquery, but it can call an IMMUTABLE function that does. Same
-- rule as talent_urls_https (https only, no javascript:/data:), applied to every element.
CREATE OR REPLACE FUNCTION public.all_https(urls text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT NOT EXISTS (SELECT 1 FROM unnest(urls) AS u WHERE u !~* '^https://');
$$;--> statement-breakpoint

-- ───────────────────────────── project links ─────────────────────────────

ALTER TABLE "portfolio_items" ADD COLUMN IF NOT EXISTS "links" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint

-- Copy the old fixed pair into the list. The old columns stay (see the header) and are
-- re-copied by 0021 just before they are dropped, catching anything the old code wrote between
-- this migration and the deploy.
UPDATE "portfolio_items"
SET "links" = array_remove(ARRAY["repo_url", "live_url"], NULL)
WHERE "repo_url" IS NOT NULL OR "live_url" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "portfolio_items" ADD CONSTRAINT "item_links_https" CHECK (public.all_https("links"));--> statement-breakpoint
ALTER TABLE "portfolio_items" ADD CONSTRAINT "item_links_max" CHECK (cardinality("links") <= 10);--> statement-breakpoint

-- ───────────────────────────── experience ─────────────────────────────

CREATE TABLE "talent_experience" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"role" text NOT NULL,
	"company" text NOT NULL,
	"start_date" date NOT NULL,
	-- NULL = current role.
	"end_date" date,
	"description" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "experience_date_order" CHECK ("end_date" IS NULL OR "start_date" <= "end_date")
);--> statement-breakpoint
ALTER TABLE "talent_experience" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "talent_experience" ADD CONSTRAINT "talent_experience_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "experience_talent_order_idx" ON "talent_experience" USING btree ("talent_id","sort_order");--> statement-breakpoint

-- Visibility follows the parent profile, exactly as portfolio_items does.
CREATE POLICY "experience_select" ON "talent_experience" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_experience"."talent_id" and (p.is_published or p.user_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "experience_write_own" ON "talent_experience" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_experience"."talent_id" and p.user_id = (select auth.uid())))
  WITH CHECK (exists (select 1 from talent_profiles p where p.id = "talent_experience"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint

CREATE TRIGGER talent_experience_updated_at BEFORE UPDATE ON talent_experience
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- ───────────────────────────── education ─────────────────────────────

CREATE TABLE "talent_education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"school" text NOT NULL,
	"degree" text DEFAULT '' NOT NULL,
	"start_year" smallint,
	"end_year" smallint,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "education_year_range" CHECK (
	  ("start_year" IS NULL OR "start_year" BETWEEN 1950 AND 2100)
	  AND ("end_year" IS NULL OR "end_year" BETWEEN 1950 AND 2100)
	),
	CONSTRAINT "education_year_order" CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "start_year" <= "end_year")
);--> statement-breakpoint
ALTER TABLE "talent_education" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "talent_education" ADD CONSTRAINT "talent_education_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "education_talent_order_idx" ON "talent_education" USING btree ("talent_id","sort_order");--> statement-breakpoint

CREATE POLICY "education_select" ON "talent_education" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_education"."talent_id" and (p.is_published or p.user_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "education_write_own" ON "talent_education" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_education"."talent_id" and p.user_id = (select auth.uid())))
  WITH CHECK (exists (select 1 from talent_profiles p where p.id = "talent_education"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint

CREATE TRIGGER talent_education_updated_at BEFORE UPDATE ON talent_education
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- ───────────────────────────── project-media bucket ─────────────────────────────
--
-- Same shape and reasoning as the `media` bucket in 0011: public read (portfolio images are
-- rendered on public profiles), 5 MB cap, raster types only (no SVG — it can carry script),
-- and every object under the uploader's own user id, which is what the write policies check.
--
-- `media` is NOT dropped. Images uploaded before this migration live there and their
-- item_media rows point at it; lib/actions/media.ts deletes from whichever bucket a URL names.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-media',
  'project-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;--> statement-breakpoint

DROP POLICY IF EXISTS "project_media_public_read" ON storage.objects;--> statement-breakpoint
CREATE POLICY "project_media_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'project-media');--> statement-breakpoint

DROP POLICY IF EXISTS "project_media_insert_own_folder" ON storage.objects;--> statement-breakpoint
CREATE POLICY "project_media_insert_own_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-media' AND (storage.foldername(name))[1] = (select auth.uid())::text);--> statement-breakpoint

DROP POLICY IF EXISTS "project_media_update_own_folder" ON storage.objects;--> statement-breakpoint
CREATE POLICY "project_media_update_own_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-media' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  WITH CHECK (bucket_id = 'project-media' AND (storage.foldername(name))[1] = (select auth.uid())::text);--> statement-breakpoint

DROP POLICY IF EXISTS "project_media_delete_own_folder" ON storage.objects;--> statement-breakpoint
CREATE POLICY "project_media_delete_own_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
