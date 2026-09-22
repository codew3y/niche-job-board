import 'server-only';

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
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1); // one extra to detect "is there a next page" without a count query

  if (params.q) {
    // Postgres full-text via websearch syntax, so a user can type "stripe -shopify" and get
    // what they expect. `or` across title/description keeps short queries useful.
    query = query.or(`title.ilike.%${params.q}%,description.ilike.%${params.q}%`);
  }
  if (params.engagement) query = query.eq('engagement_type', params.engagement);
  if (params.locationType) query = query.eq('location_type', params.locationType);
  if (params.experience) query = query.eq('experience_level', params.experience);
  // Budget overlap, not containment: a £3–5k job matches a "£4k+" search.
  if (params.budgetMin !== undefined)
    query = query.or(`budget_max.gte.${params.budgetMin},budget_max.is.null`);
  if (params.budgetMax !== undefined)
    query = query.or(`budget_min.lte.${params.budgetMax},budget_min.is.null`);

  const cursor = decodeCursor(params.cursor);
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
      hasMore && last?.published_at ? encodeCursor({ at: last.published_at, id: last.id }) : null,
  };
}

/** Skill filtering needs a join, so it is a separate path rather than bolted onto the above. */
export async function listJobsBySkills(slugs: string[], limit = 20) {
  const supabase = await createClient();
  const { data: skillRows } = await supabase.from('skills').select('id').in('slug', slugs);
  const ids = (skillRows ?? []).map((s) => s.id);
  if (ids.length === 0) return [];

  const { data } = await supabase.from('job_skills').select('job_id').in('skill_id', ids);
  const jobIds = [...new Set((data ?? []).map((r) => r.job_id))].slice(0, limit);
  return jobIds;
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
