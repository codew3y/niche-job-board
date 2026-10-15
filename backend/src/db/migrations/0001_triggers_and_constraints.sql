-- Triggers, generated counters and the constraints Drizzle cannot express.
--
-- Everything here exists because the application layer is the wrong place to enforce it.
-- A counter maintained in a server action drifts the first time a row is deleted by a
-- cascade; an audit log written by the caller is not an audit log.

-- ─────────────────────────── updated_at ───────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;--> statement-breakpoint

CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER talent_profiles_updated_at BEFORE UPDATE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER portfolio_items_updated_at BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER client_profiles_updated_at BEFORE UPDATE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint

-- ──────────────────── portfolio_item_count ────────────────────
-- The publish-gate CHECK reads this column. A CHECK cannot run a subquery, so the count has
-- to be maintained here — and it must be right, or the gate is decorative.
CREATE OR REPLACE FUNCTION sync_portfolio_item_count() RETURNS trigger
LANGUAGE plpgsql AS $$
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

CREATE TRIGGER portfolio_items_count_sync
  AFTER INSERT OR DELETE OR UPDATE OF talent_id ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION sync_portfolio_item_count();--> statement-breakpoint

-- ──────────────────── has_talent / has_client ────────────────────
-- Denormalised onto user_profiles so middleware and the role switcher can answer
-- "which dashboards exist?" without two joins per request.
CREATE OR REPLACE FUNCTION sync_user_role_flags() RETURNS trigger
LANGUAGE plpgsql AS $$
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

CREATE TRIGGER talent_profiles_role_flags AFTER INSERT OR DELETE ON talent_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_role_flags();--> statement-breakpoint
CREATE TRIGGER client_profiles_role_flags AFTER INSERT OR DELETE ON client_profiles
  FOR EACH ROW EXECUTE FUNCTION sync_user_role_flags();--> statement-breakpoint

-- ──────────────────── application audit trail ────────────────────
-- SECURITY DEFINER so the row is written regardless of the caller's RLS. application_events
-- has no INSERT policy on purpose: an audit log a user can write is not an audit log.
CREATE OR REPLACE FUNCTION log_application_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO application_events (application_id, from_status, to_status, actor_id)
    VALUES (NEW.id, NULL, NEW.status, auth.uid());
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO application_events (application_id, from_status, to_status, actor_id)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER applications_audit AFTER INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION log_application_status_change();--> statement-breakpoint

-- ──────────────────── conversation recency ────────────────────
CREATE OR REPLACE FUNCTION touch_conversation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
  RETURN NULL;
END;
$$;--> statement-breakpoint

CREATE TRIGGER messages_touch_conversation AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION touch_conversation();--> statement-breakpoint

-- Postgres treats NULLs as distinct in a UNIQUE constraint, so the composite unique on
-- (client_id, talent_id, job_id) does NOT stop two general-enquiry threads between the same
-- pair. This partial index closes that hole.
CREATE UNIQUE INDEX conversations_general_unique
  ON conversations (client_id, talent_id)
  WHERE job_id IS NULL;--> statement-breakpoint

-- ──────────────────── deletion: tombstone, don't erase ────────────────────
-- A conversation has two owners. One party leaving must not erase the other party's record
-- of the exchange (docs/constraints.md §5). messages.sender_id is ON DELETE SET NULL, so the
-- row survives; this redacts the body at the same moment.
CREATE OR REPLACE FUNCTION redact_messages_on_user_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE messages
     SET body = '[message removed — account deleted]',
         is_redacted = 'account_deleted'
   WHERE sender_id = OLD.id;
  RETURN OLD;
END;
$$;--> statement-breakpoint

CREATE TRIGGER auth_user_delete_redacts_messages BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION redact_messages_on_user_delete();--> statement-breakpoint

-- ──────────────────── match_cache housekeeping ────────────────────
-- TTL sweep. Wired to Supabase Cron (managed pg_cron) in Phase 4; harmless before then.
CREATE OR REPLACE FUNCTION purge_expired_match_cache() RETURNS void
LANGUAGE sql AS $$
  DELETE FROM match_cache WHERE expires_at < now();
$$;
