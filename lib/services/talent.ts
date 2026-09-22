import 'server-only';

import { createClient } from '../supabase/server';
import { decodeCursor, encodeCursor } from './cursor';
import type { TalentSearchParams } from '../schemas/search';

/**
 * Talent browse and public profile.
 *
 * Only published profiles are reachable. That is enforced by RLS, not by the `.eq` below —
 * the filter is there so the query is honest about its intent, not so it is safe.
 */

export type TalentListItem = {
  id: string;
  slug: string;
  headline: string;
  bio: string;
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  currency: string;
  availability: string;
  years_experience: number | null;
  website_url: string | null;
  portfolio_item_count: number;
  updated_at: string;
  talent_skills: { skills: { name: string; slug: string } | null }[];
};

export async function listTalent(params: TalentSearchParams) {
  const supabase = await createClient();
  const limit = Math.min(params.limit ?? 20, 50);

  let query = supabase
    .from('talent_profiles')
    .select(
      `id, slug, headline, bio, hourly_rate_min, hourly_rate_max, currency, availability,
       years_experience, website_url, portfolio_item_count, updated_at,
       talent_skills ( skills ( name, slug ) )`,
    )
    .eq('is_published', true)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1);

  if (params.q) query = query.or(`headline.ilike.%${params.q}%,bio.ilike.%${params.q}%`);
  if (params.availability) query = query.eq('availability', params.availability);
  if (params.rateMin !== undefined) {
    query = query.or(`hourly_rate_max.gte.${params.rateMin},hourly_rate_max.is.null`);
  }
  if (params.rateMax !== undefined) {
    query = query.or(`hourly_rate_min.lte.${params.rateMax},hourly_rate_min.is.null`);
  }

  const cursor = decodeCursor(params.cursor);
  if (cursor) query = query.lt('updated_at', cursor.at);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as TalentListItem[];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page.at(-1);

  return {
    talent: page,
    nextCursor: hasMore && last ? encodeCursor({ at: last.updated_at, id: last.id }) : null,
  };
}

export async function getTalentBySlug(slug: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('talent_profiles')
    .select(
      `id, user_id, slug, headline, bio, hourly_rate_min, hourly_rate_max, currency,
       availability, years_experience, timezone, website_url, github_url, linkedin_url,
       portfolio_item_count, is_published, accepts_messages, updated_at,
       talent_skills ( proficiency, years, skills ( name, slug, category ) ),
       portfolio_items ( id, title, description, role, outcome, tech_stack, repo_url,
                         live_url, cover_image_url, sort_order )`,
    )
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as TalentProfileDetail | null;
}

/**
 * The public profile shape.
 *
 * Declared explicitly because Supabase infers a to-one embedded relation as an array — the
 * generated type says `skills: {...}[]` where exactly one row comes back. Casting at every
 * use site would scatter the workaround; naming the real shape once keeps it in one place.
 */
export type TalentProfileDetail = {
  id: string;
  user_id: string;
  slug: string;
  headline: string;
  bio: string;
  hourly_rate_min: string | null;
  hourly_rate_max: string | null;
  currency: string;
  availability: string;
  years_experience: number | null;
  timezone: string | null;
  website_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  portfolio_item_count: number;
  is_published: boolean;
  accepts_messages: boolean;
  updated_at: string;
  talent_skills: {
    proficiency: string;
    years: number | null;
    skills: { name: string; slug: string; category: string } | null;
  }[];
  portfolio_items: {
    id: string;
    title: string;
    description: string;
    role: string | null;
    outcome: string | null;
    tech_stack: string[];
    repo_url: string | null;
    live_url: string | null;
    cover_image_url: string | null;
    sort_order: number;
  }[];
};

export const AVAILABILITY_LABEL: Record<string, string> = {
  full_time: 'Full time',
  part_time: 'Part time',
  occasional: 'Occasional',
  unavailable: 'Not available',
};
