-- Certifications on developer profiles.
--
-- Hand-written, like 0010-0021. Mirrors lib/db/schema/talent.ts; if the two ever disagree, the
-- schema files are the spec and this file is the bug.
--
-- Same shape and visibility as talent_experience (migration 0020): plain rows under the profile,
-- readable by anyone while the profile is published (and always by its owner), writable only by
-- the owner. The fields follow LinkedIn's certification model (name, issuing organisation,
-- issue and expiry dates, credential ID, credential URL), so an entry copied from LinkedIn or a
-- Credly / Accredible badge page fits without translation.
--
-- EXPAND ONLY. Safe to apply before the code is deployed.
--
-- ROLLBACK (data written to the table is lost):
--   DROP TABLE IF EXISTS talent_certifications;
--   then delete this migration's row from drizzle.__drizzle_migrations.

CREATE TABLE "talent_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"talent_id" uuid NOT NULL,
	"name" text NOT NULL,
	"issuer" text NOT NULL,
	-- Month precision: the form posts YYYY-MM and stores the 1st.
	"issued_on" date NOT NULL,
	-- NULL = does not expire.
	"expires_on" date,
	"credential_id" text,
	-- Where anyone can check it: a Credly / Accredible badge page or the issuer's verify page.
	"verification_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certification_name_length" CHECK (char_length("name") BETWEEN 2 AND 200),
	CONSTRAINT "certification_issuer_length" CHECK (char_length("issuer") BETWEEN 1 AND 160),
	CONSTRAINT "certification_credential_length" CHECK ("credential_id" IS NULL OR char_length("credential_id") <= 200),
	CONSTRAINT "certification_date_order" CHECK ("expires_on" IS NULL OR "issued_on" <= "expires_on"),
	-- https only, like every other URL column (no javascript:, data: or plain http).
	CONSTRAINT "certification_url_https" CHECK ("verification_url" IS NULL OR "verification_url" ~* '^https://')
);--> statement-breakpoint
ALTER TABLE "talent_certifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "talent_certifications" ADD CONSTRAINT "talent_certifications_talent_id_talent_profiles_id_fk"
  FOREIGN KEY ("talent_id") REFERENCES "public"."talent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certification_talent_order_idx" ON "talent_certifications" USING btree ("talent_id","sort_order");--> statement-breakpoint

-- Visibility follows the parent profile, exactly as talent_experience does.
CREATE POLICY "certification_select" ON "talent_certifications" AS PERMISSIVE FOR SELECT TO "anon", "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_certifications"."talent_id" and (p.is_published or p.user_id = (select auth.uid()))));--> statement-breakpoint
CREATE POLICY "certification_write_own" ON "talent_certifications" AS PERMISSIVE FOR ALL TO "authenticated"
  USING (exists (select 1 from talent_profiles p where p.id = "talent_certifications"."talent_id" and p.user_id = (select auth.uid())))
  WITH CHECK (exists (select 1 from talent_profiles p where p.id = "talent_certifications"."talent_id" and p.user_id = (select auth.uid())));--> statement-breakpoint

CREATE TRIGGER talent_certifications_updated_at BEFORE UPDATE ON talent_certifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
