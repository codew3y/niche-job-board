import 'server-only';

import { budgetFilters } from './currency-filters';
import { createClient } from '../supabase/server';
import { decodeCursor, encodeCursor } from './cursor';
import type { JobSearchParams } from '../schemas/search';

/**
 * Job browse and detail.
 *
 * This is the **non-AI fallback path** (story M8, flows §8): filters and full-text search
 * over Postgres, no embeddings involved. If the matching layer were deleted this would still
 * be a usable job board — which is the whole goal of Phase 3.
 *
 * Every query runs through the anon/authenticated client, so RLS decides what is visible.
 * Draft jobs are invisible here without any `status` filter in the application code; the
 * policy does it. The explicit filter is belt-and-braces, not the protection.
 */

export type JobListItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  engagement_type: string;
  budget_min: string | null;
  budget_max: string | null;
  currency: string;
  location_type: string;
  location: string | null;
  experience_level: string | null;
  published_at: string | null;
  client_profiles: { company_name: string; logo_url: string | null } | null;
  job_skills: { is_required: boolean; skills: { name: string; slug: string } | null }[];
};

export async function listJobs(params: JobSearchParams) {
  const supabase = await createClient();
  const limit = Math.min(params.limit ?? 20, 50);

  let query = supabase
    .from('jobs')
    .select(
      `id, slug, title, description, engagement_type, budget_min, budget_max, currency,
       location_type, location, experience_level, published_at,
       client_profiles ( company_name, logo_url ),
       job_skills ( is_required, skills ( name, slug ) )`,
    )
    .eq('status', 'open')
    .limit(limit + 1); // one extra to detect "is there a next page" without a count query

  /**
   * Sort, which `jobSearchParams` has also parsed and ignored. Budget sorts run within one
   * currency (budgetFilters below scopes the list), and put NULLs last:
   * a job with no stated budget is not the cheapest job, it is an unknown, and ranking it
   * first under "lowest budget" would be actively misleading.
   *
   * `id` is always the tiebreaker so the order is total — two jobs published in the same
   * second must not be able to swap places between pages and duplicate or skip a row.
   */
  if (params.sort === 'budget_high') {
    query = query
      .order('budget_max', { ascending: false, nullsFirst: false })
      .order('id', { ascending: false });
  } else if (params.sort === 'budget_low') {
    query = query
      .order('budget_min', { ascending: true, nullsFirst: false })
      .order('id', { ascending: false });
  } else {
    query = query.order('published_at', { ascending: false }).order('id', { ascending: false });
  }

  if (params.q) {
    /**
     * Real full-text search over the generated `search_vector` column (migration 0013).
     *
     * `websearch` is the syntax people already know from a search box: bare words are ANDed,
     * "quoted phrases" stay together, and a leading - excludes — so `stripe -shopify` does
     * what it looks like. It also cannot throw on malformed input, unlike to_tsquery, which
     * raises a syntax error on a stray operator and would turn a typo into a 500.
     */
    query = query.textSearch('search_vector', params.q, { type: 'websearch' });
  }
  if (params.engagement) query = query.eq('engagement_type', params.engagement);
  if (params.locationType) query = query.eq('location_type', params.locationType);
  if (params.experience) query = query.eq('experience_level', params.experience);
  // Budget sorts and filters compare within one currency (overlap, not containment); see
  // lib/services/currency-filters.ts. "Newest first" with no budget filter adds nothing here.
  for (const filter of budgetFilters(params)) query = query.or(filter);

  /**
   * Skill filtering, which `jobSearchParams` has parsed and `listJobs` has ignored since it
   * was written. Two steps rather than an embedded inner join: PostgREST returns a duplicated
   * parent row per matching child, which would break both the page size and the cursor.
   *
   * ANY of the selected skills, not ALL. Someone filtering "Stripe, Postgres" is describing
   * the kind of work they want, not a checklist a job must satisfy in full.
   */
  if (params.skills.length > 0) {
    const ids = await jobIdsWithSkills(params.skills);
    if (ids.length === 0) return { jobs: [], nextCursor: null };
    query = query.in('id', ids);
  }

  /**
   * The cursor encodes published_at, so it is only meaningful for the recency sort. Applying
   * it to a budget sort would filter on a column the results are not ordered by and silently
   * drop rows. "Load more" is therefore hidden on budget sorts rather than made to lie.
   */
  const cursor = params.sort === 'recent' ? decodeCursor(params.cursor) : null;
  if (cursor) query = query.lt('published_at', cursor.at);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as JobListItem[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    jobs: page,
    nextCursor:
      params.sort === 'recent' && hasMore && last?.published_at
        ? encodeCursor({ at: last.published_at, id: last.id })
        : null,
  };
}

/**
 * Job ids carrying any of these skill slugs.
 *
 * Unknown slugs resolve to nothing rather than being ignored: a filter on a skill that does
 * not exist must return no jobs, not every job. Silently dropping the unrecognised half of a
 * filter is how a filtered list quietly becomes an unfiltered one.
 */
export async function jobIdsWithSkills(slugs: string[]): Promise<string[]> {
  const supabase = await createClient();
  const { data: skillRows } = await supabase.from('skills').select('id').in('slug', slugs);
  const ids = (skillRows ?? []).map((s) => s.id);
  if (ids.length === 0) return [];

  const { data } = await supabase.from('job_skills').select('job_id').in('skill_id', ids);
  return [...new Set((data ?? []).map((r) => r.job_id))];
}

export async function getJobBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(
      `id, slug, title, description, responsibilities, requirements, engagement_type,
       budget_min, budget_max, currency, location_type, location, experience_level,
       status, deadline, published_at, created_at,
       client_profiles ( id, company_name, website, industry, about, logo_url ),
       job_skills ( is_required, skills ( name, slug, category ) )`,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}
