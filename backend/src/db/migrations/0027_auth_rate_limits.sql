-- Rate limits for signing in, signing up and password reset.
--
-- Hand-written, like 0010-0026. Found by the October 2026 security review. The auth actions call
-- Supabase Auth from the server, so Supabase's own per-IP limits see Vercel's address, not the
-- visitor's: one person guessing passwords, or flooding reset emails, spends the allowance every
-- visitor shares. frontend/lib/actions/auth-limit.ts counts attempts here per visitor IP and per
-- email address before it calls Supabase.
--
-- Email addresses are stored only as a SHA-256 hash (the key is built in the app), and rows older
-- than a day are deleted on every call, so this holds no personal data worth reading and never
-- grows past a day of attempts.
--
-- Not in the drizzle schema, like ai_usage (0017): only the service role touches it.
--
-- EXPAND ONLY. Safe to apply before the code is deployed (nothing calls it yet), and the code
-- lets attempts through if the function is missing, so the order does not matter.
--
-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.reserve_auth_attempt(text, integer, integer);
--   DROP TABLE IF EXISTS auth_attempts;
--   then delete this migration's row from drizzle.__drizzle_migrations.

CREATE TABLE "auth_attempts" (
  "key" text NOT NULL,
  "at" timestamp with time zone NOT NULL DEFAULT now()
);--> statement-breakpoint

ALTER TABLE "auth_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- No policy for anon or authenticated, and no table rights either: 0005's default privileges
-- would otherwise grant them ALL.
REVOKE ALL ON "auth_attempts" FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON "auth_attempts" TO service_role;--> statement-breakpoint

CREATE INDEX "auth_attempts_key_at_idx" ON "auth_attempts" ("key", "at");--> statement-breakpoint
CREATE INDEX "auth_attempts_at_idx" ON "auth_attempts" ("at");--> statement-breakpoint

/**
 * Record an attempt for p_key, or refuse it when p_limit attempts already fall inside the last
 * p_window_seconds. Returns true when the attempt may go ahead.
 *
 * The advisory lock serialises callers for the same key, so a burst of parallel requests cannot
 * all read "4 of 5 used" and all go through.
 */
CREATE OR REPLACE FUNCTION public.reserve_auth_attempt(
  p_key text, p_limit integer, p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));

  DELETE FROM auth_attempts WHERE at < now() - interval '1 day';

  IF (SELECT count(*) FROM auth_attempts
       WHERE key = p_key AND at > now() - make_interval(secs => p_window_seconds)) >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO auth_attempts (key) VALUES (p_key);
  RETURN true;
END;
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.reserve_auth_attempt(text, integer, integer)
  FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.reserve_auth_attempt(text, integer, integer) TO service_role;
