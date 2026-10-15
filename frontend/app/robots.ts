import type { MetadataRoute } from 'next';

import { siteUrl } from '@techselect/backend/env';

/**
 * robots.txt, generated rather than static, so the sitemap URL follows the deployment.
 *
 * What is disallowed is the interesting part. Everything under /dashboard, /onboarding and
 * /api is private or pointless to index — but the reason to list them is not secrecy. RLS is
 * what protects those pages; robots.txt protects nothing and is read by well-behaved crawlers
 * only. The point is crawl budget: a crawler that spends its allowance on redirect chains to
 * /login never reaches the job pages that are the whole reason this site wants indexing.
 *
 * /auth is excluded because those URLs carry one-time tokens. Indexing them would be
 * meaningless (they expire) and faintly alarming in a search result.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/browse',
          '/onboarding/',
          '/api/',
          '/auth/',
          '/select-role',
          '/verify',
        ],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
