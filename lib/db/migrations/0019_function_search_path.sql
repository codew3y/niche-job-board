-- Deleting an account failed with HTTP 500. This is why.
--
-- GoTrue runs as `supabase_auth_admin`, whose search_path does not include `public`.
-- `DELETE FROM auth.users` cascades into talent_profiles / client_profiles / portfolio_items,
-- which fires our trigger functions — and those functions referenced `user_profiles` and
-- `talent_profiles` unqualified, resolved against the CALLER's search_path. Under `postgres`
-- that works; under `supabase_auth_admin` it is:
--
--   ERROR: relation "user_profiles" does not exist (SQLSTATE 42P01)
--
-- so the whole delete rolls back. Right-to-erasure is a compliance path, not a test detail:
-- every account deletion through the admin API has been failing. Locally it left 94 orphaned
-- fixture accounts, which is how it was found.
--
-- `SET search_path` pins name resolution to the function's own definition instead of the
-- caller's session. It is also what Supabase's own linter asks for on every public function.
-- `pg_catalog` is included so built-ins keep resolving when a caller has a hostile path.
--
-- That alone is not enough. Once the names resolved, the same delete failed with
--
--   ERROR: permission denied for table user_profiles (SQLSTATE 42501)
--
-- because `supabase_auth_admin` has no grants in `public` either. The two functions that
-- actually fire during an auth.users cascade are therefore SECURITY DEFINER, so they run as
-- the owner rather than as whoever triggered the cascade — the same pattern, for the same
-- reason, as `log_application_status_change` (0001) and `redact_messages_on_user_delete`
-- (0008).
--
-- SECURITY DEFINER bypasses RLS, so it is given only where it is needed and only to functions
-- whose entire body recomputes a denormalised value from rows the cascade is already deleting.
-- Neither reads anything the caller supplied, and neither can be invoked directly — they are
-- trigger functions with no arguments. `set_updated_at` touches only NEW, and the two purge
-- functions are called deliberately by an operator, so all three keep the caller's rights.
--
-- Rollback: re-run the CREATE OR REPLACE statements from 0001 and 0008 without the SET or
-- SECURITY DEFINER clauses. Account deletion breaks again. No data is touched either way.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION sync_portfolio_item_count() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  target uuid := COALESCE(NEW.talent_id, OLD.talent_id);
BEGIN
  UPDATE talent_profiles p
     SET portfolio_item_count = (
       SELECT count(*) FROM portfolio_items i WHERE i.talent_id = target
     )
   WHERE p.id = target;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION sync_user_role_flags() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  target uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  UPDATE user_profiles u
     SET has_talent = EXISTS (SELECT 1 FROM talent_profiles t WHERE t.user_id = target),
         has_client = EXISTS (SELECT 1 FROM client_profiles c WHERE c.user_id = target)
   WHERE u.user_id = target;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION touch_conversation() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, pg_catalog AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION purge_expired_match_cache() RETURNS void
LANGUAGE sql SET search_path = public, pg_catalog AS $$
  DELETE FROM match_cache WHERE expires_at < now();
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION purge_orphaned_conversations() RETURNS void
LANGUAGE sql SET search_path = public, pg_catalog AS $$
  DELETE FROM conversations WHERE client_id IS NULL AND talent_id IS NULL;
$$;
