-- Fixes a real RLS vulnerability found by lib/db/rls.test.ts on 2026-09-20.
--
-- The messages/conversations policies consulted the `blocks` table directly. But a subquery
-- inside a policy runs as the CURRENT user, so it is itself filtered by `blocks`' own RLS --
-- and `blocks_manage_own` only exposes rows where blocker_id = auth.uid().
--
-- Consequence: a blocked sender evaluating the policy saw ZERO blocks against them, so
-- `not exists (... blocks ...)` was trivially true and the block did not hold. The send
-- succeeded. The test asserting "a blocked sender is refused" was the only thing that caught
-- it, because the policy still *looked* correct.
--
-- Fix: do the lookup in a SECURITY DEFINER function. It runs as the owner, who bypasses RLS
-- on `blocks`, so the check sees the real rows regardless of who is asking. The function
-- returns only a boolean, so it leaks nothing -- a blocked user still cannot enumerate blocks
-- or discover who blocked them, which is the property docs/flows/README.md §10 requires.

CREATE OR REPLACE FUNCTION public.is_blocked(p_blocker uuid, p_blocked uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE blocker_id = p_blocker AND blocked_id = p_blocked
  );
$$;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_blocked(uuid, uuid) FROM public;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_blocked(uuid, uuid) TO authenticated;--> statement-breakpoint

DROP POLICY IF EXISTS "messages_insert_participants" ON messages;--> statement-breakpoint
CREATE POLICY "messages_insert_participants" ON messages
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid())
    and exists (
      select 1 from conversations v
      left join client_profiles c on c.id = v.client_id
      left join talent_profiles p on p.id = v.talent_id
      where v.id = conversation_id
        and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
        and not public.is_blocked(c.user_id, (select auth.uid()))
        and not public.is_blocked(p.user_id, (select auth.uid()))
    )
  );--> statement-breakpoint

DROP POLICY IF EXISTS "conversations_insert_client" ON conversations;--> statement-breakpoint
CREATE POLICY "conversations_insert_client" ON conversations
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (
    exists (select 1 from client_profiles c
            where c.id = client_id and c.user_id = (select auth.uid()))
    and exists (
      select 1 from talent_profiles p
      where p.id = talent_id and p.is_published = true and p.accepts_messages = true
        and not public.is_blocked(p.user_id, (select auth.uid()))
    )
  );
