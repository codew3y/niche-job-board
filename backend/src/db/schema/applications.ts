import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { applicationStatus } from './enums';
import { jobs } from './jobs';
import { talentProfiles } from './talent';

/**
 * One application per talent per job, enforced by a UNIQUE constraint — at the database, not
 * only in the service layer (story M7).
 *
 * `match_score` is stored but its visibility is asymmetric: talent sees the
 * number on their own matches, clients see ordering and `match_reason` only. The column stays;
 * the gate is in the policies and the API layer.
 */
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    coverNote: text('cover_note').notNull().default(''),
    status: applicationStatus('status').notNull().default('applied'),
    /** 0–100, written by the re-ranker. Nullable: pure-vector fallback writes none (§8). */
    matchScore: integer('match_score'),
    matchReason: text('match_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('applications_job_talent_unique').on(t.jobId, t.talentId),
    check(
      'application_score_range',
      sql`${t.matchScore} is null or (${t.matchScore} between 0 and 100)`,
    ),
    index('applications_job_idx').on(t.jobId),
    index('applications_talent_idx').on(t.talentId),

    // Visible to the applying talent and to the client who owns the job. Nobody else — this
    // is the cross-tenant test in the Phase 1 exit criteria.
    pgPolicy('applications_select_participants', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))
        or exists (
          select 1 from jobs j join client_profiles c on c.id = j.client_id
          where j.id = ${t.jobId} and c.user_id = (select auth.uid())
        )`,
    }),
    // Only talent creates an application, only against a job that is actually open.
    pgPolicy('applications_insert_talent', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))
        and exists (select 1 from jobs j where j.id = ${t.jobId} and j.status = 'open')`,
    }),
    // Both sides may update, but they can change different things — which field each side is
    // allowed to touch is enforced by trigger, since RLS cannot express column-level rules.
    pgPolicy('applications_update_participants', {
      for: 'update',
      to: authenticatedRole,
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))
        or exists (
          select 1 from jobs j join client_profiles c on c.id = j.client_id
          where j.id = ${t.jobId} and c.user_id = (select auth.uid())
        )`,
    }),
  ],
).enableRLS();

/** Append-only audit of every status change. Drives the timeline both sides see. */
export const applicationEvents = pgTable(
  'application_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .references(() => applications.id, { onDelete: 'cascade' }),
    fromStatus: applicationStatus('from_status'),
    toStatus: applicationStatus('to_status').notNull(),
    actorId: uuid('actor_id').references(() => authUsers.id, { onDelete: 'set null' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('application_events_app_idx').on(t.applicationId, t.at),
    pgPolicy('application_events_select_participants', {
      for: 'select',
      to: authenticatedRole,
      using: sql`exists (
        select 1 from applications a
        left join talent_profiles p on p.id = a.talent_id
        left join jobs j on j.id = a.job_id
        left join client_profiles c on c.id = j.client_id
        where a.id = ${t.applicationId}
          and (p.user_id = (select auth.uid()) or c.user_id = (select auth.uid()))
      )`,
    }),
    // No insert/update/delete policy: rows are written by a SECURITY DEFINER trigger on
    // applications. An audit log a user can write is not an audit log.
  ],
).enableRLS();
