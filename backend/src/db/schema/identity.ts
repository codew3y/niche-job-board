import { sql } from 'drizzle-orm';
import { boolean, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { anonRole, authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { activeRole } from './enums';

/**
 * One row per account. Roles are modelled as SEPARATE PROFILE TABLES linked to this row
 * (talent_profiles / client_profiles), never as a role column here — that is what makes
 * dual-role accounts work without a role flag leaking into every query.
 *
 * `has_talent` / `has_client` are denormalised booleans kept true to the profile tables by
 * trigger, so the nav and middleware can answer "which dashboards exist?" without two joins
 * on every request.
 */
export const userProfiles = pgTable(
  'user_profiles',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    location: text('location'),
    activeRole: activeRole('active_role').notNull().default('talent'),
    hasTalent: boolean('has_talent').notNull().default(false),
    hasClient: boolean('has_client').notNull().default(false),
    /**
     * When the welcome email was sent. NULL means it has not been, and the send is guarded by
     * `is null` so it happens exactly once — see backend/src/email/welcome.ts and migration 0012.
     */
    welcomedAt: timestamp('welcomed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    // Public read: display name and avatar appear on published profiles and job cards.
    // Deliberately NOT owner-only — hiding it would mean a join-free card could not render.
    pgPolicy('user_profiles_select_public', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy('user_profiles_insert_self', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(select auth.uid()) = user_id`,
    }),
    pgPolicy('user_profiles_update_self', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(select auth.uid()) = user_id`,
      withCheck: sql`(select auth.uid()) = user_id`,
    }),
    // No delete policy: accounts are removed through auth.users, which cascades here.
  ],
).enableRLS();
