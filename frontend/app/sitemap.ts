import type { MetadataRoute } from 'next';

import { siteUrl } from '@techselect/backend/env';
import { createPublicClient } from '@techselect/backend/supabase/server';

/**
 * Dynamic sitemap: every published profile and open job, plus the static pages.
 *
 * Generated from the database rather than hand-maintained, because a hand-maintained sitemap
 * is wrong the first time anyone posts a job.
 *
 * ONLY WHAT IS PUBLIC. Draft jobs and unpublished profiles are excluded by the same
 * conditions RLS applies — listing a URL that returns 404 to a crawler wastes crawl budget
 * and teaches Google the site is unreliable. Closed and filled jobs are excluded too: the
 * page still resolves for anyone holding the link, but advertising a job nobody can apply to
 * is the "expired jobs drop out of the sitemap" requirement in §9.
 *
 * `lastModified` comes from the row, not from now(). A sitemap that claims everything changed
 * today is a sitemap a crawler learns to ignore.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    // The public site pages. No browse index: it is sign-in-only; the job and profile pages
    // below stay public.
    ...['/for-freelancers', '/for-clients', '/how-it-works', '/about'].map((path) => ({
      url: `${base}${path}`,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    // Low priority, but present: a consent screen links at them and a crawler finding them
    // 404 or redirect is the failure this project already shipped once.
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  try {
    // Anonymous and cookie-free: the sitemap lists only public rows, and reading cookies would
    // defeat the hourly cache above.
    const supabase = createPublicClient();

    const [{ data: jobs }, { data: talent }] = await Promise.all([
      supabase
        .from('jobs')
        .select('slug, updated_at, client_id')
        .eq('status', 'open')
        .order('published_at', { ascending: false })
        .limit(5000),
      supabase
        .from('talent_profiles')
        .select('slug, updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(5000),
    ]);

    return [
      ...staticRoutes,
      ...(jobs ?? []).map((job) => ({
        url: `${base}/jobs/${job.slug}`,
        lastModified: new Date(job.updated_at),
        changeFrequency: 'weekly' as const,
        // Job pages carry the JobPosting JSON-LD that feeds Google Jobs — the highest-leverage
        // SEO surface in the project, so they outrank profiles here.
        priority: 0.8,
      })),
      // A company page is listed only while it has open work (the page itself is noindex when
      // it has none). Its lastModified is its newest open job's.
      ...[
        ...(jobs ?? [])
          .reduce((latest, job) => {
            const seen = latest.get(job.client_id);
            if (!seen || job.updated_at > seen) latest.set(job.client_id, job.updated_at);
            return latest;
          }, new Map<string, string>())
          .entries(),
      ].map(([clientId, updatedAt]) => ({
        url: `${base}/company/${clientId}`,
        lastModified: new Date(updatedAt),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
      ...(talent ?? []).map((profile) => ({
        url: `${base}/talent/${profile.slug}`,
        lastModified: new Date(profile.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      })),
    ];
  } catch {
    /**
     * A database outage must not produce a 500 at /sitemap.xml. Crawlers treat a broken
     * sitemap as a signal about the whole site, and the static routes are still true — a
     * partial sitemap is strictly better than none.
     */
    return staticRoutes;
  }
}
