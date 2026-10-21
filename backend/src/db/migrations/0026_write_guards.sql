-- Write guards: what a signed-in user may change through the API, column by column.
--
-- Hand-written, like 0010-0025. Found by the October 2026 security review. 0005 grants ALL on
-- every column to the API roles, so the row policies were the only gate, and a row policy decides
-- WHICH rows, never WHICH columns. Anyone can call PostgREST directly with their own session
-- token, so every hole below was open to any signed-in user, whatever the app's forms allow:
--
--   messages       the recipient could rewrite the sender's text, sender or thread
--   conversations  either side could swap the other participant and hand them the history
--   client_profiles a company could set its own is_verified badge
--   applications   either side could forge status, score, job or applicant
--   talent_profiles / jobs / portfolio_items  embeddings and counts were writable, so a developer
--                  could copy a job's vector into their own profile and rank first for it
--   user_profiles  every account was readable by anyone, and the role flags were writable
--   applications / reports / jobs  created_at and published_at were caller-set, so backdating
--                  them slipped past the 0024 rate limits
--   storage        anyone could list every file in both buckets
--   is_blocked()   callable over the API, so "did X block me?" had an answer
--
-- Each guard is a BEFORE trigger that applies only to the API roles (authenticated / anon), the
-- pattern 0021 and 0024 use. The seed, migrations, the service role and the SECURITY DEFINER
-- helpers (sync_user_role_flags, sync_portfolio_item_count, redact_messages_on_user_delete) run
-- as other roles and are unaffected. touch_conversation runs as the caller, which is why
-- conversations.last_message_at stays writable.
--
-- Columns the app never writes are refused with 42501. Columns the database derives (embeddings,
-- counts, role flags, timestamps) are quietly reset instead, so an older client that sends one
-- back unchanged does not fail.
--
-- EXPAND ONLY as far as the app is concerned: nothing the shipped code writes is refused. Safe to
-- apply before or after the code that ships with it.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS messages_write_guard ON messages;
--   DROP TRIGGER IF EXISTS conversations_write_guard ON conversations;
--   DROP TRIGGER IF EXISTS client_profiles_write_guard ON client_profiles;
--   DROP TRIGGER IF EXISTS applications_write_guard ON applications;
--   DROP TRIGGER IF EXISTS user_profiles_write_guard ON user_profiles;
--   DROP TRIGGER IF EXISTS talent_profiles_write_guard ON talent_profiles;
--   DROP TRIGGER IF EXISTS jobs_write_guard ON jobs;
--   DROP TRIGGER IF EXISTS portfolio_items_write_guard ON portfolio_items;
--   DROP TRIGGER IF EXISTS reports_write_guard ON reports;
--   DROP FUNCTION IF EXISTS public.guard_messages(), public.guard_conversations(),
--     public.guard_client_profiles(), public.guard_applications(), public.guard_user_profiles(),
--     public.guard_talent_profiles(), public.guard_jobs(), public.guard_portfolio_items(),
--     public.guard_reports();
--   Recreate public.is_blocked from 0003 and point the two policies back at it (0015), restore
--   user_profiles_select_public (0000) and the two *_public_read storage policies (0011, 0020),
--   then DROP SCHEMA private CASCADE and delete this migration's row from
--   drizzle.__drizzle_migrations.

-- ───────────────────────────── messages ─────────────────────────────
-- The recipient may mark a message read. Nothing else about it is theirs to change.

CREATE OR REPLACE FUNCTION public.guard_messages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.read_at := NULL;
    NEW.redacted_reason := NULL;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'read_at') IS DISTINCT FROM (to_jsonb(OLD) - 'read_at') THEN
    RAISE EXCEPTION 'A message cannot be edited once sent.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS messages_write_guard ON messages;--> statement-breakpoint
CREATE TRIGGER messages_write_guard BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION public.guard_messages();--> statement-breakpoint

-- ───────────────────────────── conversations ─────────────────────────────
-- Who a conversation is between, and about which job, is fixed when it starts.
-- last_message_at moves with every message (touch_conversation runs as the sender).

CREATE OR REPLACE FUNCTION public.guard_conversations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.last_message_at := now();
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'last_message_at') IS DISTINCT FROM (to_jsonb(OLD) - 'last_message_at') THEN
    RAISE EXCEPTION 'A conversation''s participants cannot be changed.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS conversations_write_guard ON conversations;--> statement-breakpoint
CREATE TRIGGER conversations_write_guard BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION public.guard_conversations();--> statement-breakpoint

-- ───────────────────────────── client_profiles ─────────────────────────────
-- Verification is granted by the platform, never claimed.

CREATE OR REPLACE FUNCTION public.guard_client_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Verification is set by TechSelect, not by an update.' USING ERRCODE = '42501';
  END IF;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS client_profiles_write_guard ON client_profiles;--> statement-breakpoint
CREATE TRIGGER client_profiles_write_guard BEFORE INSERT OR UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_client_profiles();--> statement-breakpoint

-- ───────────────────────────── applications ─────────────────────────────
-- A new application always starts as 'applied', unscored. After that only the status moves, and
-- only along the transition table in backend/src/schemas/enums.ts (allowedStatusTransitions):
--   client (owns the job):   applied → viewed | shortlisted | rejected
--                            viewed → shortlisted | rejected
--                            shortlisted → hired | rejected
--   talent (the applicant):  applied | viewed | shortlisted → withdrawn
-- rejected, hired and withdrawn are terminal. Keep the two tables in step.

CREATE OR REPLACE FUNCTION public.guard_applications()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  allowed text[] := '{}';
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.status := 'applied';
    NEW.match_score := NULL;
    NEW.match_reason := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - ARRAY['status', 'updated_at'])
     IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status', 'updated_at']) THEN
    RAISE EXCEPTION 'Only an application''s status can be changed.' USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM jobs j JOIN client_profiles c ON c.id = j.client_id
     WHERE j.id = OLD.job_id AND c.user_id = (SELECT auth.uid())
  ) THEN
    allowed := allowed || CASE OLD.status::text
      WHEN 'applied' THEN ARRAY['viewed', 'shortlisted', 'rejected']
      WHEN 'viewed' THEN ARRAY['shortlisted', 'rejected']
      WHEN 'shortlisted' THEN ARRAY['hired', 'rejected']
      ELSE ARRAY[]::text[]
    END;
  END IF;

  IF OLD.status::text IN ('applied', 'viewed', 'shortlisted') AND EXISTS (
    SELECT 1 FROM talent_profiles p
     WHERE p.id = OLD.talent_id AND p.user_id = (SELECT auth.uid())
  ) THEN
    allowed := allowed || ARRAY['withdrawn'];
  END IF;

  IF NOT (NEW.status::text = ANY (allowed)) THEN
    RAISE EXCEPTION 'That status change is not allowed from here.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS applications_write_guard ON applications;--> statement-breakpoint
CREATE TRIGGER applications_write_guard BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION public.guard_applications();--> statement-breakpoint

-- ───────────────────────────── user_profiles ─────────────────────────────
-- has_talent / has_client are maintained by sync_user_role_flags (0001, 0019) and welcomed_at by
-- the welcome email (service role). A caller cannot set them.

CREATE OR REPLACE FUNCTION public.guard_user_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.has_talent := EXISTS (SELECT 1 FROM talent_profiles t WHERE t.user_id = NEW.user_id);
    NEW.has_client := EXISTS (SELECT 1 FROM client_profiles c WHERE c.user_id = NEW.user_id);
    NEW.welcomed_at := NULL;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  NEW.has_talent := OLD.has_talent;
  NEW.has_client := OLD.has_client;
  NEW.welcomed_at := OLD.welcomed_at;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS user_profiles_write_guard ON user_profiles;--> statement-breakpoint
CREATE TRIGGER user_profiles_write_guard BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profiles();--> statement-breakpoint

-- Nothing outside the account itself reads this row through the API: public pages present a
-- developer by headline and photo (talent_profiles), and the admin queue and email lookups use
-- the service role. Owner-only, and nothing for signed-out visitors.
DROP POLICY IF EXISTS "user_profiles_select_public" ON "user_profiles";--> statement-breakpoint
DROP POLICY IF EXISTS "user_profiles_select_self" ON "user_profiles";--> statement-breakpoint
CREATE POLICY "user_profiles_select_self" ON "user_profiles" AS PERMISSIVE FOR SELECT
  TO "authenticated" USING ((select auth.uid()) = "user_profiles"."user_id");--> statement-breakpoint

-- ───────────────── derived columns: embeddings, counts, website checks ─────────────────
-- Written by the matching pipeline (service role) and by sync_portfolio_item_count (SECURITY
-- DEFINER). A caller's value is replaced with the stored one.

CREATE OR REPLACE FUNCTION public.guard_talent_profiles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.embedding := NULL;
    NEW.embedding_updated_at := NULL;
    NEW.portfolio_item_count := 0;
    NEW.website_checked_at := NULL;
    NEW.website_status := NULL;
    NEW.created_at := now();
    RETURN NEW;
  END IF;

  NEW.embedding := OLD.embedding;
  NEW.embedding_updated_at := OLD.embedding_updated_at;
  NEW.portfolio_item_count := OLD.portfolio_item_count;
  NEW.website_checked_at := OLD.website_checked_at;
  NEW.website_status := OLD.website_status;
  NEW.created_at := OLD.created_at;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS talent_profiles_write_guard ON talent_profiles;--> statement-breakpoint
CREATE TRIGGER talent_profiles_write_guard BEFORE INSERT OR UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_talent_profiles();--> statement-breakpoint

-- published_at is what the 0024 publish limit counts, so a caller may set it (publishing) or clear
-- it, but never to a time other than now.
CREATE OR REPLACE FUNCTION public.guard_jobs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.embedding := NULL;
    NEW.embedding_updated_at := NULL;
    NEW.created_at := now();
    IF NEW.published_at IS NOT NULL THEN
      NEW.published_at := now();
    END IF;
    RETURN NEW;
  END IF;

  NEW.embedding := OLD.embedding;
  NEW.embedding_updated_at := OLD.embedding_updated_at;
  NEW.created_at := OLD.created_at;
  IF NEW.published_at IS NOT NULL AND NEW.published_at IS DISTINCT FROM OLD.published_at THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS jobs_write_guard ON jobs;--> statement-breakpoint
CREATE TRIGGER jobs_write_guard BEFORE INSERT OR UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION public.guard_jobs();--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.guard_portfolio_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.embedding := NULL;
    NEW.embedding_updated_at := NULL;
    RETURN NEW;
  END IF;

  NEW.embedding := OLD.embedding;
  NEW.embedding_updated_at := OLD.embedding_updated_at;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS portfolio_items_write_guard ON portfolio_items;--> statement-breakpoint
CREATE TRIGGER portfolio_items_write_guard BEFORE INSERT OR UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_portfolio_items();--> statement-breakpoint

-- ───────────────────────────── reports ─────────────────────────────
-- created_at is what the 0024 report limit counts; resolving is the admin's job.

CREATE OR REPLACE FUNCTION public.guard_reports()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;
  NEW.created_at := now();
  NEW.resolved_at := NULL;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS reports_write_guard ON reports;--> statement-breakpoint
CREATE TRIGGER reports_write_guard BEFORE INSERT ON reports
  FOR EACH ROW EXECUTE FUNCTION public.guard_reports();--> statement-breakpoint

-- ───────────────────────────── is_blocked ─────────────────────────────
-- The message and conversation policies need it, but as a function in `public` it was also an
-- API endpoint: rpc('is_blocked', {p_blocker: them, p_blocked: me}) told anyone whether they had
-- been blocked, the one thing 0003 says must stay secret. `private` is not exposed by PostgREST
-- (supabase/config.toml [api] schemas), so the policies can still call it and the API cannot.

CREATE SCHEMA IF NOT EXISTS private;--> statement-breakpoint
REVOKE ALL ON SCHEMA private FROM PUBLIC;--> statement-breakpoint
GRANT USAGE ON SCHEMA private TO authenticated, service_role;--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.is_blocked(p_blocker uuid, p_blocked uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = p_blocker AND blocked_id = p_blocked
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION private.is_blocked(uuid, uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION private.is_blocked(uuid, uuid) TO authenticated, service_role;--> statement-breakpoint

ALTER POLICY "conversations_insert_client" ON "conversations" TO authenticated WITH CHECK (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        and exists (
          select 1 from talent_profiles p
          where p.id = "conversations"."talent_id" and p.is_published = true and p.accepts_messages = true
          and not private.is_blocked(p.user_id, (select auth.uid()))
          and not private.is_blocked((select auth.uid()), p.user_id)
        ));--> statement-breakpoint
ALTER POLICY "messages_insert_participants" ON "messages" TO authenticated WITH CHECK ("messages"."sender_id" = (select auth.uid())
        and exists (
          select 1 from conversations v
          left join client_profiles c on c.id = v.client_id
          left join talent_profiles p on p.id = v.talent_id
          where v.id = "messages"."conversation_id"
            and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
            and not private.is_blocked(c.user_id, (select auth.uid()))
            and not private.is_blocked(p.user_id, (select auth.uid()))
            and not private.is_blocked((select auth.uid()), c.user_id)
            and not private.is_blocked((select auth.uid()), p.user_id)
        ));--> statement-breakpoint

DROP FUNCTION IF EXISTS public.is_blocked(uuid, uuid);--> statement-breakpoint

-- ───────────────────────────── storage ─────────────────────────────
-- Both buckets are public: /storage/v1/object/public/... serves any file without consulting these
-- policies, which is how every photo on the site loads. The SELECT policy only governs the
-- storage.objects table, i.e. LISTING, and USING (bucket_id = ...) let anyone list every
-- uploader's folder, unpublished profiles included. Owners still need to see their own folder:
-- the storage API reads the row back when it removes or replaces a file.

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "media_select_own_folder" ON storage.objects;--> statement-breakpoint
CREATE POLICY "media_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);--> statement-breakpoint

DROP POLICY IF EXISTS "project_media_public_read" ON storage.objects;--> statement-breakpoint
DROP POLICY IF EXISTS "project_media_select_own_folder" ON storage.objects;--> statement-breakpoint
CREATE POLICY "project_media_select_own_folder" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'project-media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
