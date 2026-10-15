-- A block is MUTUAL. Neither party can write to the other until it is lifted.
--
-- Until now it was one-directional: the policy asked only "has the other party blocked me",
-- so the person who blocked first kept a working channel to someone who could no longer
-- reply. That is a megaphone handed to whoever blocks first, and on a product whose entire
-- moderation story in v1 is block + report (docs/constraints.md §6) it is the wrong default —
-- the control exists to end an exchange, not to win it.
--
-- Caught by lib/services/messaging.test.ts: the blocker could still insert into the thread.
--
-- The blocker is not trapped: unblocking restores both directions at once, which is the
-- honest way to reopen a conversation you closed.
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
        ));--> statement-breakpoint

-- Same rule at thread creation: a client who blocked a developer cannot then open a new
-- conversation with them. Without this, blocking becomes a way to reach someone in a thread
-- they cannot leave.
ALTER POLICY "conversations_insert_client" ON "conversations" TO authenticated WITH CHECK (exists (select 1 from client_profiles c where c.id = "conversations"."client_id" and c.user_id = (select auth.uid()))
        and exists (
          select 1 from talent_profiles p
          where p.id = "conversations"."talent_id" and p.is_published = true and p.accepts_messages = true
          and not public.is_blocked(p.user_id, (select auth.uid()))
          and not public.is_blocked((select auth.uid()), p.user_id)
        ));
