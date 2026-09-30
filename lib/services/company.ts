import 'server-only';

import { cache } from 'react';

import { createClient } from '../supabase/server';
import type { JobListItem } from './jobs';

/**
 * The public company page (/company/<id>): a client's company and its open jobs.
 *
 * Nothing here is new exposure. `client_profiles` is readable by anyone (policy
 * `client_select_public`: company info is attached to every published job), and the jobs
 * query asks only for `status = 'open'`, which RLS would allow anyway. The select lists name
 * the public columns explicitly, so `user_id` never leaves the database for this page.
 *
 * Addressed by id, not a slug: `client_profiles` has no slug column, and adding one is a
 * migration. The id is already public (it is in every job's structured data path), and a
 * company rename does not break the URL.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** A malformed id is a 404, never a query: Postgres would reject it with a 500. */
export const isCompanyId = (id: string) => UUID.test(id);

export type PublicCompany = {
  id: string;
  company_name: string;
  website: string | null;
  industry: string | null;
  about: string;
  logo_url: string | null;
  is_verified: boolean;
  created_at: string;
};

/** Cached per request: generateMetadata and the page both need it. */
export const getCompany = cache(async (id: string): Promise<PublicCompany | null> => {
  if (!isCompanyId(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('client_profiles')
    .select('id, company_name, website, industry, about, logo_url, is_verified, created_at')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

/**
 * The company's open jobs, newest first, in the shape JobCard renders (the same columns as
 * listJobs). Capped at 50: a company page is a summary, and Browse is where a long list belongs.
 * Cached per request, like getCompany.
 */
export const listCompanyOpenJobs = cache(async (clientId: string): Promise<JobListItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(
      `id, slug, title, description, engagement_type, budget_min, budget_max, currency,
       location_type, location, experience_level, published_at,
       client_profiles ( company_name, logo_url ),
       job_skills ( is_required, skills ( name, slug ) )`,
    )
    .eq('client_id', clientId)
    .eq('status', 'open')
    .order('published_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as JobListItem[];
});
