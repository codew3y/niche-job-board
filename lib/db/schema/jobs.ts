import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { anonRole, authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { engagementType, experienceLevel, jobStatus, locationType } from './enums';
import { tsvector } from './types';
import { skills } from './skills';

export const clientProfiles = pgTable(
  'client_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    companyName: text('company_name').notNull(),
    website: text('website'),
    industry: text('industry'),
    // company_size was removed from the product; the column is dropped by the pending contract
    // step lib/db/migrations-pending/0024_drop_legacy_columns.sql, after the code is deployed.
    about: text('about').notNull().default(''),
    logoUrl: text('logo_url'),
    isVerified: boolean('is_verified').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('client_website_https', sql`${t.website} is null or ${t.website} ~* '^https://'`),
    // Company info is public: it is attached to every published job card.
    pgPolicy('client_select_public', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`true`,
    }),
    pgPolicy('client_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
    pgPolicy('client_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
    pgPolicy('client_delete_own', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clientProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    description: text('description').notNull(),
    responsibilities: text('responsibilities'),
    requirements: text('requirements'),

    engagementType: engagementType('engagement_type').notNull(),
    budgetMin: numeric('budget_min', { precision: 12, scale: 2 }),
    budgetMax: numeric('budget_max', { precision: 12, scale: 2 }),
    /** ISO 4217. §7 of PROJECT.md: never conflate entities or currencies. */
    currency: text('currency').notNull().default('USD'),

    locationType: locationType('location_type').notNull().default('remote'),
    location: text('location'),
    experienceLevel: experienceLevel('experience_level'),

    status: jobStatus('status').notNull().default('draft'),
    deadline: timestamp('deadline', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    /**
     * Generated, so it can never drift from the text it indexes — there is no trigger to
     * forget and no write path that can skip it. setweight ranks the title above the body.
     */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(description, '')), 'B') || setweight(to_tsvector('english', coalesce(requirements, '')), 'C')`,
    ),
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingUpdatedAt: timestamp('embedding_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'job_budget_order',
      sql`${t.budgetMin} is null or ${t.budgetMax} is null or ${t.budgetMin} <= ${t.budgetMax}`,
    ),
    check('job_currency_iso', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    // An onsite or hybrid role without a location is unfilterable, so it is not allowed.
    check(
      'job_location_present',
      sql`${t.locationType} = 'remote' or (${t.location} is not null and length(btrim(${t.location})) > 0)`,
    ),
    check(
      'job_published_has_timestamp',
      sql`${t.status} = 'draft' or ${t.publishedAt} is not null`,
    ),

    // The hot list query: open jobs, newest first (§5.1).
    index('jobs_status_published_idx').on(t.status, t.publishedAt),
    index('jobs_client_idx').on(t.clientId),
    index('jobs_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    /**
     * Postgres full-text search — the non-AI fallback path (flow §8, story M8).
     *
     * Indexes the generated `searchVector` COLUMN, not an expression. The previous version
     * indexed to_tsvector(...) directly, which PostgREST cannot target with textSearch — so
     * the index existed, was never queried, and the service fell back to ilike under a comment
     * claiming otherwise. See migration 0013.
     */
    index('jobs_search_idx').using('gin', t.searchVector),

    pgPolicy('jobs_select_open_or_own', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`${t.status} <> 'draft' or exists (
        select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid())
      )`,
    }),
    pgPolicy('jobs_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from client_profiles c where c.id = ${t.clientId} and c.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

export const jobSkills = pgTable(
  'job_skills',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    /** Required vs nice-to-have. The hard-filter layer only uses required (§8). */
    isRequired: boolean('is_required').notNull().default(true),
  },
  (t) => [
    primaryKey({ columns: [t.jobId, t.skillId] }),
    index('job_skills_skill_idx').on(t.skillId),
    pgPolicy('job_skills_select', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`exists (
        select 1 from jobs j where j.id = ${t.jobId}
        and (j.status <> 'draft' or exists (
          select 1 from client_profiles c where c.id = j.client_id and c.user_id = (select auth.uid())
        ))
      )`,
    }),
    pgPolicy('job_skills_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (
        select 1 from jobs j join client_profiles c on c.id = j.client_id
        where j.id = ${t.jobId} and c.user_id = (select auth.uid())
      )`,
      withCheck: sql`exists (
        select 1 from jobs j join client_profiles c on c.id = j.client_id
        where j.id = ${t.jobId} and c.user_id = (select auth.uid())
      )`,
    }),
  ],
).enableRLS();
