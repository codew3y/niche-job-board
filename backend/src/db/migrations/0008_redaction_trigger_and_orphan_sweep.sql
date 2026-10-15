-- Point the redaction trigger at the renamed column, and add the housekeeping sweep for
-- conversations whose participants have both deleted their accounts.

CREATE OR REPLACE FUNCTION redact_messages_on_user_delete() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE messages
     SET body = '[message removed — account deleted]',
         redacted_reason = 'account_deleted'
   WHERE sender_id = OLD.id;
  RETURN OLD;
END;
$$;--> statement-breakpoint

-- When BOTH participants have left, the row still exists but no policy can ever match it:
-- it is unreachable by every user and serves no one. Keeping it is not a privacy position,
-- it is just litter. Swept on the same schedule as the match_cache TTL (Phase 4).
CREATE OR REPLACE FUNCTION purge_orphaned_conversations() RETURNS void
LANGUAGE sql AS $$
  DELETE FROM conversations WHERE client_id IS NULL AND talent_id IS NULL;
$$;
