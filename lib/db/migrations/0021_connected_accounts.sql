-- Connected GitHub and LinkedIn accounts on developer profiles.
--
-- Hand-written, like 0010-0020. Mirrors lib/db/schema/talent.ts.
--
-- WHAT CHANGES. A developer no longer types a GitHub or LinkedIn address. They press "Connect
-- GitHub" / "Connect LinkedIn" and sign in with that provider; Supabase links the identity to
-- their account (auth.identities). Then:
--   - GitHub: the profile address comes from the identity itself (its username), so it is the
--     account they proved they own.
--   - LinkedIn: LinkedIn's sign-in does not return a profile address, so once connected the
--     developer pastes their linkedin.com/in/ link. Only a connected account may have one.
-- The public profile shows each link only when its account is connected.
--
-- WHY A GUARD TRIGGER. talent_update_own lets a developer update their own row, which would let
-- anyone set github_connected_at through the API and fake a connection. The trigger refuses
-- changes to the connection columns (and github_url) from the API roles; only
-- sync_connected_accounts(), which runs as the owner and reads auth.identities, writes them.
--
-- EXPAND ONLY. Nothing is dropped. Typed GitHub/LinkedIn addresses from before this migration
-- stay in the table; the profile simply stops showing an address that is not connected.
--
-- ROLLBACK:
--   DROP TRIGGER IF EXISTS talent_connected_accounts_guard ON talent_profiles;
--   DROP FUNCTION IF EXISTS public.guard_connected_accounts();
--   DROP FUNCTION IF EXISTS public.sync_connected_accounts();
--   ALTER TABLE talent_profiles DROP COLUMN IF EXISTS github_connected_at,
--     DROP COLUMN IF EXISTS linkedin_connected_at;
--   then delete this migration's row from drizzle.__drizzle_migrations.

ALTER TABLE "talent_profiles" ADD COLUMN IF NOT EXISTS "github_connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN IF NOT EXISTS "linkedin_connected_at" timestamp with time zone;--> statement-breakpoint

-- ───────────────────────────── the guard ─────────────────────────────
--
-- Runs as the caller (not SECURITY DEFINER), so `current_user` is the API role for requests
-- through PostgREST, and the function owner inside sync_connected_accounts().

CREATE OR REPLACE FUNCTION public.guard_connected_accounts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- A new profile starts unconnected; sync_connected_accounts() fills it in.
    NEW.github_url := NULL;
    NEW.github_connected_at := NULL;
    NEW.linkedin_connected_at := NULL;
    NEW.linkedin_url := NULL;
    RETURN NEW;
  END IF;

  IF NEW.github_url IS DISTINCT FROM OLD.github_url
     OR NEW.github_connected_at IS DISTINCT FROM OLD.github_connected_at
     OR NEW.linkedin_connected_at IS DISTINCT FROM OLD.linkedin_connected_at THEN
    RAISE EXCEPTION 'Connected accounts are set by signing in to the provider, not by an update.'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.linkedin_url IS DISTINCT FROM OLD.linkedin_url
     AND NEW.linkedin_url IS NOT NULL
     AND NEW.linkedin_connected_at IS NULL THEN
    RAISE EXCEPTION 'Connect LinkedIn before adding a LinkedIn link.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS talent_connected_accounts_guard ON talent_profiles;--> statement-breakpoint
CREATE TRIGGER talent_connected_accounts_guard
  BEFORE INSERT OR UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_connected_accounts();--> statement-breakpoint

-- ───────────────────────────── the sync ─────────────────────────────
--
-- Reads the caller's own identities and writes the connection columns. Called after an OAuth
-- sign-in or link (app/auth/callback), after the profile row is created (onboarding), and after
-- a disconnect. Idempotent. A connection keeps its first connected_at.
--
-- On disconnect it clears what the connection provided: the GitHub address, and the LinkedIn
-- address (only a connected account may show one).

CREATE OR REPLACE FUNCTION public.sync_connected_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
  gh_login text;
  gh_found boolean;
  li_found boolean;
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  SELECT coalesce(i.identity_data ->> 'user_name', i.identity_data ->> 'preferred_username')
    INTO gh_login
    FROM auth.identities i
   WHERE i.user_id = uid AND i.provider = 'github'
   ORDER BY i.created_at
   LIMIT 1;
  gh_found := FOUND;

  PERFORM 1 FROM auth.identities i WHERE i.user_id = uid AND i.provider = 'linkedin_oidc';
  li_found := FOUND;

  -- GitHub usernames: letters, digits and single hyphens, at most 39 characters.
  IF gh_found AND (gh_login IS NULL OR gh_login !~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$') THEN
    gh_login := NULL;
  END IF;

  UPDATE talent_profiles t
     SET github_url = CASE
           WHEN gh_found AND gh_login IS NOT NULL THEN 'https://github.com/' || gh_login
           WHEN t.github_connected_at IS NOT NULL THEN NULL  -- was connected, now is not
           ELSE t.github_url
         END,
         github_connected_at = CASE WHEN gh_found THEN coalesce(t.github_connected_at, now()) END,
         linkedin_url = CASE
           WHEN li_found THEN t.linkedin_url
           WHEN t.linkedin_connected_at IS NOT NULL THEN NULL
           ELSE t.linkedin_url
         END,
         linkedin_connected_at = CASE WHEN li_found THEN coalesce(t.linkedin_connected_at, now()) END
   WHERE t.user_id = uid;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.sync_connected_accounts() FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.sync_connected_accounts() TO authenticated;--> statement-breakpoint

-- ───────────────────────────── backfill ─────────────────────────────
--
-- Developers who already sign in with GitHub (or LinkedIn) are connected from the start, so
-- their GitHub address keeps showing. Runs as the migrating role, which the guard lets through.

UPDATE talent_profiles t
   SET github_url = 'https://github.com/' || g.login,
       github_connected_at = now()
  FROM (
    SELECT DISTINCT ON (i.user_id)
           i.user_id,
           coalesce(i.identity_data ->> 'user_name', i.identity_data ->> 'preferred_username') AS login
      FROM auth.identities i
     WHERE i.provider = 'github'
     ORDER BY i.user_id, i.created_at
  ) g
 WHERE g.user_id = t.user_id
   AND g.login ~ '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$';--> statement-breakpoint

UPDATE talent_profiles t
   SET linkedin_connected_at = now()
 WHERE EXISTS (
   SELECT 1 FROM auth.identities i WHERE i.user_id = t.user_id AND i.provider = 'linkedin_oidc'
 );
