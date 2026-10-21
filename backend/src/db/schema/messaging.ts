import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { reportSubject } from './enums';
import { clientProfiles, jobs } from './jobs';
import { talentProfiles } from './talent';

/**
 * Direct messaging — in v1 by owner decision, against the ADR's own
 * recommendation. Async only: polling, not websockets. The §1 non-goal now excludes
 * *real-time* chat specifically (typing indicators, presence, sockets).
 *
 * THIS IS THE HIGHEST-CONSEQUENCE RLS SURFACE IN THE PRODUCT. A leak here exposes private
 * correspondence between two people, not a draft job post. Every policy below is
 * participant-only, and the Phase 1 cross-user read test must fail closed against both tables.
 *
 * Out of scope in v1, named so that "we have messaging" does not quietly grow: attachments,
 * group threads, read receipts, presence, rich text.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /**
     * Both participants are NULLABLE with ON DELETE SET NULL, not CASCADE.
     *
     * A conversation has two owners. The privacy policy commits to the counterparty
     * keeping their record when one party deletes their account — if Alice leaves, Bob does
     * not lose the thread he may need for a dispute. CASCADE contradicted that commitment
     * outright: it destroyed the whole thread.
     *
     * It also broke deletion mechanically. The BEFORE DELETE redaction trigger on
     * `auth.users` UPDATEs `messages`, which queues an RI check that fires at END of
     * statement — by which point the cascade had already removed the conversation, so the
     * check failed with a foreign-key violation and no account could be deleted at all.
     *
     * SET NULL fixes both: the thread survives with one side tombstoned.
     */
    clientId: uuid('client_id').references(() => clientProfiles.id, { onDelete: 'set null' }),
    talentId: uuid('talent_id').references(() => talentProfiles.id, { onDelete: 'set null' }),
    /**
     * Optional anchor: "about this job". Null for a general enquiry.
     * SET NULL rather than CASCADE — a closed or deleted job must not take the conversation
     * about it with it, for the same reason a departing participant does not.
     */
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One thread per client/talent/job triple. Postgres treats NULLs as DISTINCT in a UNIQUE
    // constraint, so this one never fires for the general enquiry (job_id IS NULL) — that case
    // is covered by the partial index below, which is a separate database object rather than a
    // property of this constraint.
    unique('conversations_participants_unique').on(t.clientId, t.talentId, t.jobId),
    uniqueIndex('conversations_general_unique')
      .on(t.clientId, t.talentId)
      .where(sql`${t.jobId} is null`),
    index('conversations_client_idx').on(t.clientId, t.lastMessageAt),
    index('conversations_talent_idx').on(t.talentId, t.lastMessageAt),

    // A NULL side is a deleted account. `exists` is simply false for it, so the surviving
    // participant still sees the thread and nobody inherits it.
    pgPolicy('conversations_select_participants', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))
        or exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
    }),
    /**
     * Only a client opens a conversation, and only when the talent profile is published,
     * accepts messages, and has not blocked them. All three checks are in the database so
     * that a bug in the service layer cannot bypass them.
     */
    pgPolicy('conversations_insert_client', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))
        and exists (
          select 1 from talent_profiles p
          where p.id = ${t.talentId} and p.is_published = true and p.accepts_messages = true
          and not private.is_blocked(p.user_id, (select auth.uid()))
          and not private.is_blocked((select auth.uid()), p.user_id)
        )`,
    }),
    pgPolicy('conversations_update_participants', {
      for: 'update',
      to: authenticatedRole,
      using: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))
        or exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    /**
     * Nullable on purpose. Account deletion TOMBSTONES the sender and redacts the body rather
     * than destroying the row — a conversation has two owners, and one party leaving must not
     * erase the other party's record of the exchange.
     */
    senderId: uuid('sender_id').references(() => authUsers.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    /**
     * Why the body was replaced, or null if it is the original text. Named for what it holds:
     * the column was `is_redacted` while storing the string 'account_deleted', which reads
     * as a boolean and is not one.
     */
    redactedReason: text('redacted_reason'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('message_body_length', sql`length(${t.body}) between 1 and 5000`),
    index('messages_conversation_idx').on(t.conversationId, t.createdAt),

    pgPolicy('messages_select_participants', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (
        select 1 from conversations v
        left join client_profiles c on c.id = v.client_id
        left join talent_profiles p on p.id = v.talent_id
        where v.id = ${t.conversationId}
          and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
      )`,
    }),
    /**
     * Send only as yourself, only into a thread you are in, and only if no block stands in
     * EITHER direction. The check is re-evaluated per message, not just at thread creation,
     * so a block applied mid-conversation takes effect on the next send.
     *
     * The block lookup goes through `private.is_blocked`, a SECURITY DEFINER function, and
     * MUST NOT be inlined back into a subquery over `blocks`. A subquery inside a policy runs
     * as the current user and is therefore filtered by `blocks`' own RLS, so a blocked sender
     * saw zero blocks against themselves and the check passed. That shipped as a working-
     * looking policy and was caught only by backend/src/db/rls.test.ts — see migration 0003.
     */
    pgPolicy('messages_insert_participants', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.senderId} = (select auth.uid())
        and exists (
          select 1 from conversations v
          left join client_profiles c on c.id = v.client_id
          left join talent_profiles p on p.id = v.talent_id
          where v.id = ${t.conversationId}
            and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
            and not private.is_blocked(c.user_id, (select auth.uid()))
            and not private.is_blocked(p.user_id, (select auth.uid()))
            and not private.is_blocked((select auth.uid()), c.user_id)
            and not private.is_blocked((select auth.uid()), p.user_id)
        )`,
    }),
    // Update exists only to stamp read_at on messages you received.
    pgPolicy('messages_update_recipient', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.senderId} is distinct from (select auth.uid()) and exists (
        select 1 from conversations v
        left join client_profiles c on c.id = v.client_id
        left join talent_profiles p on p.id = v.talent_id
        where v.id = ${t.conversationId}
          and (c.user_id = (select auth.uid()) or p.user_id = (select auth.uid()))
      )`,
    }),
  ],
).enableRLS();

/**
 * A block is a SILENT no-op to the blocked sender — the send appears to succeed. Telling
 * someone they have been blocked is what makes them create a second account
 *.
 *
 * It is also MUTUAL: neither side can write to the other while it stands (migration 0010).
 * The one-directional version left the person who blocked first with a working channel to
 * someone who could no longer reply, which is a megaphone rather than an exit.
 */
export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    check('block_not_self', sql`${t.blockerId} <> ${t.blockedId}`),
    index('blocks_blocked_idx').on(t.blockedId),
    // You can see and manage only the blocks YOU made. A blocked user must not be able to
    // discover that they were blocked by reading this table.
    pgPolicy('blocks_manage_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${t.blockerId} = (select auth.uid())`,
      withCheck: sql`${t.blockerId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

/** Report → manual takedown. v1 has no review queue. */
export const reports = pgTable(
  'reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reporterId: uuid('reporter_id').references(() => authUsers.id, { onDelete: 'set null' }),
    subjectType: reportSubject('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    reason: text('reason').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (t) => [
    index('reports_unresolved_idx').on(t.resolvedAt, t.createdAt),
    pgPolicy('reports_insert_self', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.reporterId} = (select auth.uid())`,
    }),
    pgPolicy('reports_select_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.reporterId} = (select auth.uid())`,
    }),
    // Resolution happens through the service role, which bypasses RLS. No update policy.
  ],
).enableRLS();
