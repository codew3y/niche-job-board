import 'server-only';

import { readCache } from '../matching/cache';
import { createClient, createServiceClient } from '../supabase/server';

/**
 * Match feeds, read from the warm cache.
 *
 * NEVER computes. If there is no cached ranking the answer is "not ready", and the page says
 * so — it does not trigger a re-rank and make the reader wait. On the free tier that wait is
 * 30 to 120 seconds (measured), which is not a page load, it is an outage with a spinner.
 * `lib/matching/warm.ts` fills the cache on a schedule.
 *
 * THE SCORE ASYMMETRY (ADR-007 D2) IS ENFORCED HERE, not in the UI. A client receives
 * ordering and a reason and never a number; a developer receives their own score on their own
 * matches. Leaving that to a component means one forgotten prop leaks it.
 */

export type TalentMatch = {
  jobId: string;
  slug: string;
  title: string;
  companyName: string | null;
  budgetMin: string | null;
  budgetMax: string | null;
  currency: string;
  engagementType: string;
  locationType: string;
  /** Their own score, on their own matches. Null when the ranking is uncalibrated. */
  score: number | null;
  reason: string | null;
};

export type CandidateMatch = {
  talentId: string;
  slug: string;
  headline: string;
  portfolioItemCount: number;
  websiteUrl: string | null;
  /** DELIBERATELY ABSENT. A client sees order and reason, never a number (ADR-007 D2). */
  reason: string | null;
};

export type MatchFeed<T> =
  | { state: 'ready'; matches: T[] }
  /** Nothing cached yet. The warmer has not reached this subject — not an error. */
  | { state: 'pending' }
  /** Warm, and genuinely nothing worth showing. Different from pending and says so. */
  | { state: 'empty' }
  /** The profile or job has no embedding: too sparse to match, or ingest has not run. */
  | { state: 'too-sparse' };

/**
 * A job's ranked candidates, for its owner.
 *
 * Only the reason crosses the boundary. The score stays in `match_cache`, which has no
 * `authenticated` policy at all, so even a crafted request cannot read it.
 */
export async function candidatesForJob(jobId: string): Promise<MatchFeed<CandidateMatch>> {
  const service = createServiceClient();

  const { data: job } = await service
    .from('jobs')
    .select('embedding')
    .eq('id', jobId)
    .maybeSingle();
  if (!job?.embedding) return { state: 'too-sparse' };

  const cached = await readCache('job', jobId);
  if (!cached) return { state: 'pending' };
  if (cached.length === 0) return { state: 'empty' };

  const { data: profiles } = await service
    .from('talent_profiles')
    .select('id, slug, headline, portfolio_item_count, website_url')
    .in(
      'id',
      cached.map((c) => c.targetId),
    )
    .eq('is_published', true);

  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  const matches = cached
    .map((c) => {
      const profile = byId.get(c.targetId);
      // A candidate who unpublished since the ranking was computed is dropped rather than
      // rendered as a broken row. The TTL and invalidation catch up; this is the guard for
      // the window between.
      if (!profile) return null;
      return {
        talentId: profile.id,
        slug: profile.slug,
        headline: profile.headline,
        portfolioItemCount: profile.portfolio_item_count,
        websiteUrl: profile.website_url,
        reason: c.reason,
      };
    })
    .filter((m): m is CandidateMatch => m !== null);

  return matches.length > 0 ? { state: 'ready', matches } : { state: 'empty' };
}

/** A developer's ranked jobs, with their own scores. */
export async function matchesForMe(talentId: string): Promise<MatchFeed<TalentMatch>> {
  const service = createServiceClient();

  const { data: profile } = await service
    .from('talent_profiles')
    .select('embedding')
    .eq('id', talentId)
    .maybeSingle();
  if (!profile?.embedding) return { state: 'too-sparse' };

  const cached = await readCache('talent', talentId);
  if (!cached) return { state: 'pending' };
  if (cached.length === 0) return { state: 'empty' };

  /**
   * Read the jobs as the USER, not the service role. The ranking decided which jobs to show;
   * RLS decides which they may see. A job closed since the ranking was computed disappears
   * here, which is the correct outcome and one the service role would have hidden.
   */
  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from('jobs')
    .select(
      'id, slug, title, budget_min, budget_max, currency, engagement_type, location_type, status, client_profiles ( company_name )',
    )
    .in(
      'id',
      cached.map((c) => c.targetId),
    )
    .eq('status', 'open')
    .overrideTypes<
      {
        id: string;
        slug: string;
        title: string;
        budget_min: string | null;
        budget_max: string | null;
        currency: string;
        engagement_type: string;
        location_type: string;
        status: string;
        client_profiles: { company_name: string } | null;
      }[]
    >();

  const byId = new Map((jobs ?? []).map((j) => [j.id, j]));

  const matches = cached
    .map((c) => {
      const job = byId.get(c.targetId);
      if (!job) return null;
      return {
        jobId: job.id,
        slug: job.slug,
        title: job.title,
        companyName: job.client_profiles?.company_name ?? null,
        budgetMin: job.budget_min,
        budgetMax: job.budget_max,
        currency: job.currency,
        engagementType: job.engagement_type,
        locationType: job.location_type,
        // Their own score, on their own match. This is the side of the asymmetry that is
        // allowed to see a number.
        score: c.score >= 0 ? c.score : null,
        reason: c.reason,
      };
    })
    .filter((m): m is TalentMatch => m !== null);

  return matches.length > 0 ? { state: 'ready', matches } : { state: 'empty' };
}

/**
 * The threshold below which a match is not worth showing as "strong".
 *
 * 70 is the same number the J5 calibration gate uses, and that is the point: the eval asserts
 * a job with no good candidate produces nothing above 69, so the display threshold and the
 * measured gate cannot drift apart.
 */
export const STRONG_MATCH_SCORE = 70;
