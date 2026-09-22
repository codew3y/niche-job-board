-- BOOKKEEPING ONLY. Every statement below is already applied to every database.
--
-- Migrations 0010–0014 were written by hand, so drizzle's snapshot never learned about them
-- and `db:generate` proposes recreating the lot. Left as generated, this file fails on the
-- first statement — it drops a constraint that is already gone.
--
-- Made idempotent instead, so the snapshot catches up and docs/schema.md (generated FROM the
-- snapshot) stops describing a publish gate that no longer exists. That staleness is why this
-- file exists rather than being deleted: the snapshot is what the ERD is built from.
--
-- Nothing here changes behaviour. See 0010 (mutual blocks), 0012 (welcomed_at),
-- 0013 (full-text search) and 0014 (no publish gate) for the real changes.

ALTER TABLE "talent_profiles" DROP CONSTRAINT IF EXISTS "talent_publish_gate";--> statement-breakpoint
DROP INDEX IF EXISTS "jobs_fts_idx";--> statement-breakpoint
ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "welcomed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "talent_profiles" ADD COLUMN IF NOT EXISTS "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(headline, '')), 'A') || setweight(to_tsvector('english', coalesce(bio, '')), 'B')) STORED;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B') || setweight(to_tsvector('english', coalesce(requirements, '')), 'C')) STORED;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "talent_search_idx" ON "talent_profiles" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_search_idx" ON "jobs" USING gin ("search_vector");--> statement-breakpoint
ALTER POLICY "conversations_insert_client" ON "conversations" TO authenticated WITH CHECK (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        and exists (
          select 1 from talent_profiles p
          where p.id = "conversations"."talent_id" and p.is_published = true and p.accepts_messages = true
          and not public.is_blocked(p.user_id, (select auth.uid()))
          and not public.is_blocked((select auth.uid()), p.user_id)
        ));--> statement-breakpoint
ALTER POLICY "messages_insert_participants" ON "messages" TO authenticated WITH CHECK ("messages"."sender_id" = (select auth.uid())
        and exists (
          select 1 from conversations v
          left join client_profiles c on c.id = v.client_id
          left join talent_profiles p on p.id = v.talent_id
          where v.id = "messages"."conversation_id"
            and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
            and not public.is_blocked(c.user_id, (select auth.uid()))
            and not public.is_blocked(p.user_id, (select auth.uid()))
            and not public.is_blocked((select auth.uid()), c.user_id)
            and not public.is_blocked((select auth.uid()), p.user_id)
        ));