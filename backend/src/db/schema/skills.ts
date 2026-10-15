import { sql } from 'drizzle-orm';
import { boolean, index, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { anonRole, authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { skillCategory } from './enums';

/**
 * The curated taxonomy. Seeded from backend/src/seeds/skills.seed.ts (122 rows, taxonomy v2).
 *
 * Users pick from this list rather than typing free text, so filters and matching stay clean.
 * `is_approved = false` is the "request a skill" path: anyone can create a row, nobody can
 * use it in a filter until it is reviewed. That way gaps surface instead of being absorbed
 * silently.
 */
export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    category: skillCategory('category').notNull(),
    /** Alias strings that resolve TO this row. Globally unique — see skills.seed.test.ts. */
    aliases: text('aliases')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isApproved: boolean('is_approved').notNull().default(false),
    /** Who asked for it, when it came in via the request path. */
    requestedBy: uuid('requested_by').references(() => authUsers.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('skills_category_idx').on(t.category),
    // Alias lookup is the hot path for the picker and for import normalisation.
    index('skills_aliases_gin_idx').using('gin', t.aliases),
    pgPolicy('skills_select_approved', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`is_approved = true`,
    }),
    // Anyone signed in may request a skill, but cannot self-approve: the WITH CHECK pins
    // is_approved to false at the database, not in the service layer.
    pgPolicy('skills_request_insert', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`is_approved = false and requested_by = (select auth.uid())`,
    }),
  ],
).enableRLS();
