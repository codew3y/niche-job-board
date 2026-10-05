-- Profile photos for developers, and company logos (client_profiles.logo_url, unused until now).
--
-- Hand-written, like 0010-0024.
--
-- WHERE AN IMAGE MAY COME FROM. Both columns accept only an image in the owner's own folder of
-- the `media` storage bucket (migration 0011: public read, writes limited to the uploader's own
-- folder). The check names the row's own user_id, so a profile cannot point at someone else's
-- upload, and cannot point at an arbitrary URL either: an outside image on a profile could be a
-- tracking pixel that tells its host who viewed the page. The host part is pinned by the app's
-- image allow-list (next.config.ts remotePatterns), which is how these render. https only, except
-- local Supabase (http://127.0.0.1 or localhost), which serves files over plain http.
--
-- EXPAND ONLY. No existing logo_url values (checked locally and in production), so the new
-- check on client_profiles cannot fail.
--
-- ROLLBACK:
--   ALTER TABLE talent_profiles DROP CONSTRAINT IF EXISTS talent_avatar_own_upload,
--     DROP COLUMN IF EXISTS avatar_url;
--   ALTER TABLE client_profiles DROP CONSTRAINT IF EXISTS client_logo_own_upload;
--   then delete this migration's row from drizzle.__drizzle_migrations.

ALTER TABLE "talent_profiles" ADD COLUMN IF NOT EXISTS "avatar_url" text;--> statement-breakpoint

ALTER TABLE "talent_profiles" ADD CONSTRAINT "talent_avatar_own_upload" CHECK (
  "avatar_url" IS NULL OR (
    "avatar_url" ~* '^(https://|http://(127\.0\.0\.1|localhost)(:[0-9]+)?/)'
    AND position(('/storage/v1/object/public/media/' || "user_id"::text || '/') in "avatar_url") > 0
  )
);--> statement-breakpoint

ALTER TABLE "client_profiles" ADD CONSTRAINT "client_logo_own_upload" CHECK (
  "logo_url" IS NULL OR (
    "logo_url" ~* '^(https://|http://(127\.0\.0\.1|localhost)(:[0-9]+)?/)'
    AND position(('/storage/v1/object/public/media/' || "user_id"::text || '/') in "logo_url") > 0
  )
);
