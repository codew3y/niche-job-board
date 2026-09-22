import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgPolicy,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { anonRole, authUsers, authenticatedRole } from 'drizzle-orm/supabase';

import { availability, proficiency } from './enums';
import { tsvector } from './types';
import { skills } from './skills';

/**
 * The talent side. Portfolio evidence is optional on both routes — a developer links an
 * external site, adds in-app items, or both — but at least one is required to publish
 * (ADR-004).
 *
 * The publish gate is enforced in three places on purpose: a CHECK constraint here, a Zod
 * refinement in the service layer, and the UI completeness checklist. The CHECK is the one
 * that cannot be bypassed.
 */
export const talentProfiles = pgTable(
  'talent_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .unique()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull().unique(),
    headline: text('headline').notNull(),
    bio: text('bio').notNull().default(''),

    hourlyRateMin: numeric('hourly_rate_min', { precision: 10, scale: 2 }),
    hourlyRateMax: numeric('hourly_rate_max', { precision: 10, scale: 2 }),
    /** ISO 4217. Never assume a currency — PROJECT.md holds budgets in several. */
    currency: text('currency').notNull().default('USD'),
    availability: availability('availability').notNull().default('part_time'),
    yearsExperience: integer('years_experience'),
    timezone: text('timezone'),

    // External evidence. All nullable and independent (ADR-004).
    websiteUrl: text('website_url'),
    githubUrl: text('github_url'),
    linkedinUrl: text('linkedin_url'),

    /**
     * ADR-007 D3: v1 never writes these. They exist from the first migration so that closing
     * the publish-gate hole later is a feature, not a migration on a live RLS-protected table.
     */
    websiteCheckedAt: timestamp('website_checked_at', { withTimezone: true }),
    websiteStatus: smallint('website_status'),

    /** ADR-007 D1: honoured server-side, not by hiding a button. */
    acceptsMessages: boolean('accepts_messages').notNull().default(true),

    /** Denormalised so the publish CHECK can see it without a subquery. Trigger-maintained. */
    portfolioItemCount: integer('portfolio_item_count').notNull().default(0),

    isPublished: boolean('is_published').notNull().default(false),
    /** Generated full-text vector — headline weighted above bio. Migration 0013. */
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(headline, '')), 'A') || setweight(to_tsvector('english', coalesce(bio, '')), 'B')`,
    ),
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingUpdatedAt: timestamp('embedding_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * There is NO publish gate. Anyone may publish, with or without a bio, a portfolio site or
     * a single project (ADR-008, migration 0014, superseding ADR-004).
     *
     * This is a deliberate removal, not an omission — the constraint existed here and was
     * dropped. Who is worth hiring is the client's judgement; a platform gate substitutes its
     * taste for theirs and decides who gets a hearing. Thin profiles are handled by ranking
     * badly, not by being excluded.
     */
    check(
      'talent_rate_order',
      sql`${t.hourlyRateMin} is null or ${t.hourlyRateMax} is null or ${t.hourlyRateMin} <= ${t.hourlyRateMax}`,
    ),
    check('talent_currency_iso', sql`${t.currency} ~ '^[A-Z]{3}$'`),
    // https only, and no javascript:/data: — mirrors the Zod rule (PROJECT.md §5.4).
    check(
      'talent_urls_https',
      sql`(${t.websiteUrl} is null or ${t.websiteUrl} ~* '^https://')
        and (${t.githubUrl} is null or ${t.githubUrl} ~* '^https://')
        and (${t.linkedinUrl} is null or ${t.linkedinUrl} ~* '^https://')`,
    ),

    index('talent_published_idx').on(t.isPublished, t.updatedAt),
    index('talent_availability_idx').on(t.availability),
    // HNSW for cosine similarity — the retrieve step of §8. 1536 dims is inside pgvector's
    // 2000-dim index ceiling (docs/constraints.md §2).
    // Full-text search over the generated column — see the note in jobs.ts.
    index('talent_search_idx').using('gin', t.searchVector),
    index('talent_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),

    // Published profiles are public by design (docs/constraints.md §5); drafts are owner-only.
    pgPolicy('talent_select_published_or_own', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`${t.isPublished} = true or ${t.userId} = (select auth.uid())`,
    }),
    pgPolicy('talent_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
    pgPolicy('talent_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
      withCheck: sql`${t.userId} = (select auth.uid())`,
    }),
    pgPolicy('talent_delete_own', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${t.userId} = (select auth.uid())`,
    }),
  ],
).enableRLS();

export const talentSkills = pgTable(
  'talent_skills',
  {
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'restrict' }),
    proficiency: proficiency('proficiency').notNull().default('proficient'),
    years: integer('years'),
  },
  (t) => [
    primaryKey({ columns: [t.talentId, t.skillId] }),
    index('talent_skills_skill_idx').on(t.skillId),
    // Visibility follows the parent profile. Referencing talent_profiles re-applies its RLS.
    pgPolicy('talent_skills_select', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and (p.is_published or p.user_id = (select auth.uid())))`,
    }),
    pgPolicy('talent_skills_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

/**
 * In-app evidence. `tech_stack`, `repo_url` and `live_url` are the niche-specific fields —
 * they are what makes a developer's entry credible and they feed matching directly (§5.1).
 */
export const portfolioItems = pgTable(
  'portfolio_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    talentId: uuid('talent_id')
      .notNull()
      .references(() => talentProfiles.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    /** What the developer actually did. Matching leans on this more than on the stack. */
    role: text('role'),
    outcome: text('outcome'),
    techStack: text('tech_stack')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    repoUrl: text('repo_url'),
    liveUrl: text('live_url'),
    coverImageUrl: text('cover_image_url'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    sortOrder: integer('sort_order').notNull().default(0),
    embedding: vector('embedding', { dimensions: 1536 }),
    embeddingUpdatedAt: timestamp('embedding_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'item_date_order',
      sql`${t.startedAt} is null or ${t.endedAt} is null or ${t.startedAt} <= ${t.endedAt}`,
    ),
    check(
      'item_urls_https',
      sql`(${t.repoUrl} is null or ${t.repoUrl} ~* '^https://') and (${t.liveUrl} is null or ${t.liveUrl} ~* '^https://')`,
    ),
    index('items_talent_order_idx').on(t.talentId, t.sortOrder),
    index('items_tech_stack_gin_idx').using('gin', t.techStack),
    index('items_embedding_hnsw_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
    pgPolicy('items_select', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and (p.is_published or p.user_id = (select auth.uid())))`,
    }),
    pgPolicy('items_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
      withCheck: sql`exists (select 1 from talent_profiles p where p.id = ${t.talentId} and p.user_id = (select auth.uid()))`,
    }),
  ],
).enableRLS();

export const itemMedia = pgTable(
  'item_media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => portfolioItems.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    /** NOT NULL by design: alt text is an accessibility gate, not a nicety (§9). */
    altText: text('alt_text').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (t) => [
    index('media_item_order_idx').on(t.itemId, t.sortOrder),
    pgPolicy('media_select', {
      for: 'select',
      to: [anonRole, authenticatedRole],
      using: sql`exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = ${t.itemId} and (p.is_published or p.user_id = (select auth.uid()))
      )`,
    }),
    pgPolicy('media_write_own', {
      for: 'all',
      to: authenticatedRole,
      using: sql`exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = ${t.itemId} and p.user_id = (select auth.uid())
      )`,
      withCheck: sql`exists (
        select 1 from portfolio_items i
        join talent_profiles p on p.id = i.talent_id
        where i.id = ${t.itemId} and p.user_id = (select auth.uid())
      )`,
    }),
  ],
).enableRLS();
