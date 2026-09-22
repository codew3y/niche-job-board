import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExternalLink } from '@/components/shared/external-link';
import { formatRange } from '@/components/shared/money';
import { PortfolioSection } from '@/components/portfolio/portfolio-section';
import { siteUrl } from '@/lib/env';
import { AVAILABILITY_LABEL, getTalentBySlug } from '@/lib/services/talent';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getTalentBySlug(slug);
  if (!p) return { title: 'Profile not found' };
  return {
    title: p.headline,
    description: p.bio.slice(0, 155),
    alternates: { canonical: `${siteUrl()}/talent/${p.slug}` },
  };
}

export default async function TalentProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getTalentBySlug(slug);
  if (!p) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = user?.id === p.user_id;

  // RLS lets the owner read their own draft. Everyone else gets a 404 — not a 403, which
  // would confirm the profile exists (docs/api.md §4).
  if (!p.is_published && !isOwner) notFound();

  const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
  const items = [...(p.portfolio_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            p.is_published
              ? {
                  '@context': 'https://schema.org',
                  '@type': 'ProfilePage',
                  mainEntity: {
                    '@type': 'Person',
                    name: p.headline,
                    description: p.bio,
                    url: `${siteUrl()}/talent/${p.slug}`,
                    // sameAs is how a search engine connects this profile to the same person
                    // elsewhere — the external links are the point, not decoration (§9).
                    sameAs: [p.website_url, p.github_url, p.linkedin_url].filter(Boolean),
                    knowsAbout: p.talent_skills.map((s) => s.skills?.name).filter(Boolean),
                  },
                }
              : {},
          ),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/talent" className="text-text-muted hover:text-text">
          ← All developers
        </Link>
      </nav>

      {!p.is_published && isOwner && (
        <p
          role="status"
          className="mb-6 rounded-[--radius] border border-warning/40 bg-warning/5 p-3 text-sm"
        >
          This is a draft — only you can see it.{' '}
          <Link href="/onboarding/talent/review" className="text-accent hover:underline">
            Finish and publish
          </Link>
        </p>
      )}

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{p.headline}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
          <span>{AVAILABILITY_LABEL[p.availability] ?? p.availability}</span>
          {p.years_experience ? <span>{p.years_experience} years</span> : null}
          {p.timezone ? <span>{p.timezone}</span> : null}
          {rate ? <span className="font-medium text-text tabular-nums">{rate}</span> : null}
        </p>

        {(p.github_url || p.linkedin_url) && (
          <p className="mt-3 flex gap-4 text-sm">
            {p.github_url && (
              <ExternalLink href={p.github_url} className="text-accent">
                GitHub
              </ExternalLink>
            )}
            {p.linkedin_url && (
              <ExternalLink href={p.linkedin_url} className="text-accent">
                LinkedIn
              </ExternalLink>
            )}
          </p>
        )}
      </header>

      <section className="mt-6">
        <h2 className="sr-only">About</h2>
        <p className="whitespace-pre-line leading-relaxed text-pretty">{p.bio}</p>
      </section>

      {p.talent_skills.length > 0 && (
        <section className="mt-8">
          <h2 className="font-medium">Skills</h2>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {p.talent_skills.map((s) => (
              <li
                key={s.skills?.slug}
                className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-sm text-text-muted"
              >
                {s.skills?.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8">
        <PortfolioSection websiteUrl={p.website_url} items={items} isOwner={isOwner} />
      </div>
    </main>
  );
}
