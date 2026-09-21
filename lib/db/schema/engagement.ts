import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { notificationType } from './enums';
import { clientProfiles, jobs } from './jobs';
import { talentProfiles } from './talent';

export const savedJobs = pgTable(
  'saved_jobs',
  {
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.talentId, t.jobId] }),
    pgPolicy('saved_jobs_manage_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

export const savedTalent = pgTable(
  'saved_talent',
  {
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientProfiles.id, { onDelete: 'cascade' }),
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.clientId, t.talentId] }),
    // Owner-only both ways: talent must not be able to see who bookmarked them.
    pgPolicy('saved_talent_manage_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    type: notificationType('type').notNull(),
    payload: jsonb('payload')
      .notNull()
      .default(sql`'{}'::jsonb`),
    /**
     * Idempotency key for the "fires exactly once per event, idempotent under retry"
     * criterion (story M9). A retry that recomputes the same key is a no-op, not a duplicate.
     */
    dedupeKey: text('dedupe_key').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('notifications_dedupe_unique').on(t.userId, t.dedupeKey),
    index('notifications_user_unread_idx').on(t.userId, t.readAt, t.createdAt),
    pgPolicy('notifications_select_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
    }),
    // Update is for marking read. Rows are created by the service role.
    pgPolicy('notifications_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

/**
 * Re-rank results, cached with a TTL and invalidated on source edit (§8).
 *
 * No SELECT policy for `authenticated` at all — this table is read through the service role
 * behind /api/match/*, which applies the ADR-007 D2 asymmetry: talent gets the score, clients
 * get ordering and reason. Exposing the table directly would hand clients the number the
 * policy layer is there to withhold.
 */
export const matchCache = pgTable(
  'match_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** 'talent' → ranking jobs for a profile; 'job' → ranking profiles for a job. */
    subjectType: text('subject_type').notNull(),
    subjectId: uuid('subject_id').notNull(),
    targetId: uuid('target_id').notNull(),
    score: integer('score').notNull(),
    reason: text('reason'),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    unique('match_cache_subject_target_unique').on(t.subjectType, t.subjectId, t.targetId),
    check('match_cache_subject_type', sql`${t.subjectType} in ('talent', 'job')`),
    check('match_cache_score_range', sql`${t.score} between 0 and 100`),
    index('match_cache_lookup_idx').on(t.subjectType, t.subjectId, t.score),
    index('match_cache_expiry_idx').on(t.expiresAt),
  ],
).enableRLS();

/**
 * Dead-letter for the embedding pipeline (§8: "retry, backoff and a dead-letter table").
 * Service-role only — nothing user-facing reads it.
 */
export const embeddingFailures = pgTable(
  'embedding_failures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    attempts: integer('attempts').notNull().default(1),
    lastError: text('last_error'),
    firstFailedAt: timestamp('first_failed_at', { withTimezone: true }).notNull().defaultNow(),
    lastFailedAt: timestamp('last_failed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('embedding_failures_entity_unique').on(t.entityType, t.entityId),
    check(
      'embedding_failures_entity_type',
      sql`${t.entityType} in ('talent_profile', 'portfolio_item', 'job')`,
    ),
  ],
).enableRLS();
