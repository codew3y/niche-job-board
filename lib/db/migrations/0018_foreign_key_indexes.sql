-- Indexes on foreign keys that had none.
--
-- Postgres indexes the REFERENCED side of a foreign key automatically (it has to, to enforce
-- the constraint) and never the referencing side. That asymmetry is easy to miss and costs in
-- two places:
--
--  1. DELETES. Removing a row means scanning every referencing table to find children. Account
--     deletion is a feature here (docs/constraints.md §5) and touches most of these tables, so
--     without an index each one is a sequential scan. At seed scale that is microseconds; the
--     shape is what matters, and it only gets worse.
--
--  2. QUERIES. Four of these are filtered on directly by the application or by an RLS policy,
--     which means the policy re-evaluates per row on a scan.
--
-- Found by asking the catalogue rather than by reading code: every FK whose first column has
-- no index starting with it.

-- Filtered directly: startConversation looks up an existing thread by (client, talent, job).
CREATE INDEX IF NOT EXISTS "conversations_job_idx" ON "conversations" ("job_id");--> statement-breakpoint

-- savedJobIds/savedTalentIds filter by `in (…)` on these when rendering a page of cards, and
-- both cascade on account deletion.
CREATE INDEX IF NOT EXISTS "saved_jobs_job_idx" ON "saved_jobs" ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_talent_talent_idx" ON "saved_talent" ("talent_id");--> statement-breakpoint

-- `reports_select_own` is `reporter_id = auth.uid()`. An RLS predicate on an unindexed column
-- is evaluated per row, so this is the difference between a policy that filters and a policy
-- that scans.
CREATE INDEX IF NOT EXISTS "reports_reporter_idx" ON "reports" ("reporter_id");--> statement-breakpoint

-- Delete paths. messages.sender_id is ON DELETE SET NULL and application_events.actor_id is
-- touched by the redaction trigger, so both are walked on every account deletion.
CREATE INDEX IF NOT EXISTS "messages_sender_idx" ON "messages" ("sender_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "application_events_actor_idx" ON "application_events" ("actor_id");--> statement-breakpoint

-- skills.requested_by is the taxonomy-suggestion path. Rarely read, but it is a FK to
-- auth.users and therefore on the deletion path like the rest.
CREATE INDEX IF NOT EXISTS "skills_requested_by_idx" ON "skills" ("requested_by");
