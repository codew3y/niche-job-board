-- Table privileges for the Supabase roles.
--
-- Found on 2026-09-20 by rebuilding the database from zero: every RLS test failed with
-- "permission denied for table conversations" rather than returning zero rows.
--
-- RLS and GRANT are two independent gates, and RLS is the SECOND one. A policy can only
-- filter rows a role is already permitted to touch; with no GRANT, Postgres refuses before
-- any policy is consulted. The earlier migrations quietly relied on the default privileges
-- that the Supabase platform applies to `public` at project creation -- so they worked on a
-- provisioned project and failed on a freshly created schema. That dependency is invisible
-- until someone runs the migrations somewhere clean, which is exactly the "a stranger can run
-- it locally from a clean clone" criterion in the Definition of Done.
--
-- This follows Supabase's own convention deliberately: GRANT broadly, then let RLS decide.
-- Tables with no policy for a role (match_cache, embedding_failures) still return nothing,
-- because RLS defaults to deny -- which lib/db/rls.test.ts asserts directly. Diverging from
-- the platform convention locally would mean local and production disagree about
-- authorisation, which is the class of bug this migration exists to close.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;--> statement-breakpoint

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;--> statement-breakpoint
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;--> statement-breakpoint
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;--> statement-breakpoint

-- Anything created later inherits the same privileges, so a new table added in a future
-- migration is not silently unreachable.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;--> statement-breakpoint

-- is_blocked stays restricted: it is SECURITY DEFINER and must not be callable by anon.
REVOKE ALL ON FUNCTION public.is_blocked(uuid, uuid) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated, service_role;
