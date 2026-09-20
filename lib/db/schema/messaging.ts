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
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { reportSubject } from './enums';
import { clientProfiles } from './jobs';
import { talentProfiles } from './talent';

/**
 * Direct messaging — in v1 by owner decision (ADR-007 D1), against the ADR's own
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
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientProfiles.id, { onDelete: 'cascade' }),
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    /** Optional anchor: "about this job". Null for a general enquiry. */
    jobId: uuid('job_id'),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One thread per client/talent/job triple. Postgres treats NULLs as distinct in a UNIQUE
    // constraint, so the general-enquiry thread is additionally guarded by a partial index.
    unique('conversations_participants_unique').on(t.clientId, t.talentId, t.jobId),
    index('conversations_client_idx').on(t.clientId, t.lastMessageAt),
    index('conversations_talent_idx').on(t.talentId, t.lastMessageAt),

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
        )
        and not exists (
          select 1 from blocks b join talent_profiles p on p.id = ${t.talentId}
          where b.blocker_id = p.user_id and b.blocked_id = (select auth.uid())
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
     * erase the other party's record of the exchange (docs/constraints.md §5).
     */
    senderId: uuid('sender_id').references(() => authUsers.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    isRedacted: text('is_redacted'),
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
    // Send only as yourself, only into a thread you are in, and only if not blocked by the
    // other party. The block check is re-evaluated per message, not just at thread creation.
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
            and not exists (
              select 1 from blocks b
              where b.blocked_id = (select auth.uid())
                and b.blocker_id in (c.user_id, p.user_id)
            )
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
 * (docs/flows/README.md §10).
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

/** Report → manual takedown. v1 has no review queue (docs/constraints.md §6). */
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
