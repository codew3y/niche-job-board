import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

import { jsonLdScript } from '@/lib/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ContactDialog } from '@/components/messaging/contact-dialog';
import { ExternalLink } from '@/components/shared/external-link';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
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

  /**
   * The contact button appears only for a signed-in client, on a published profile that
   * accepts messages — the same three conditions `conversations_insert_client` enforces. This
   * is the courtesy copy of the rule; the policy is the rule, and it is what stops a crafted
   * POST from an account with no client profile.
   */
  let contactJobs: { id: string; title: string }[] | null = null;
  if (user && !isOwner && p.is_published && p.accepts_messages) {
    const { data: client } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (client) {
      const { data: openJobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('client_id', client.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20);
      contactJobs = openJobs ?? [];
    }
  }

  // RLS lets the owner read their own draft. Everyone else gets a 404 — not a 403, which
  // would confirm the profile exists (docs/api.md §4).
  if (!p.is_published && !isOwner) notFound();

  const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
  const items = [...(p.portfolio_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const facts = [
    rate
      ? [
          'Rate',
          <span key="r" className="tabular-nums">
            {rate}
          </span>,
        ]
      : null,
    ['Availability', AVAILABILITY_LABEL[p.availability] ?? p.availability],
    p.years_experience ? ['Experience', `${p.years_experience} years`] : null,
    p.timezone ? ['Time zone', p.timezone] : null,
  ].filter(Boolean) as [string, React.ReactNode][];
  const hasLinks = p.github_url || p.linkedin_url;

  return (
    <main id="main" className="gutter mx-auto w-full max-w-6xl flex-1 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
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

      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link
          href="/talent"
          className="inline-flex items-center gap-1 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All developers
        </Link>
      </nav>

      {!p.is_published && isOwner && (
        <p
          role="status"
          className="mb-8 rounded-lg border border-warning/30 bg-warning-subtle px-4 py-3 text-sm"
        >
          This is a draft — only you can see it.{' '}
          <Link href="/onboarding/talent/review" className="prose-link font-medium">
            Finish and publish
          </Link>
        </p>
      )}

      {/* Same single-aside grid as the job page: header → facts → body in DOM order. */}
      <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <header className="min-w-0 lg:col-start-1">
          <Avatar name={p.headline} size="lg" />
          <h1 className="mt-5 font-serif text-display-md text-balance">{p.headline}</h1>
          {hasLinks && (
            <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {p.github_url && (
                <ExternalLink href={p.github_url} className="font-medium">
                  GitHub
                </ExternalLink>
              )}
              {p.linkedin_url && (
                <ExternalLink href={p.linkedin_url} className="font-medium">
                  LinkedIn
                </ExternalLink>
              )}
            </p>
          )}
        </header>

        <aside aria-label="Profile details" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="rounded-lg border border-border-base bg-surface-raised p-5 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)]">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-1">
              {facts.map(([term, value]) => (
                <div key={term}>
                  <dt className="text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
                    {term}
                  </dt>
                  <dd className="mt-1 font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            {contactJobs !== null && (
              <div className="mt-6 border-t border-border-base pt-5 [&_button]:w-full">
                <ContactDialog talentId={p.id} talentHeadline={p.headline} jobs={contactJobs} />
              </div>
            )}
            {isOwner && (
              <div className="mt-6 border-t border-border-base pt-5">
                <Link
                  href="/dashboard/talent/profile"
                  className={buttonStyles({ variant: 'secondary', className: 'w-full' })}
                >
                  Edit your profile
                </Link>
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <section>
            <h2 className="sr-only">About</h2>
            <p className="text-lg leading-relaxed whitespace-pre-line text-pretty">{p.bio}</p>
          </section>

          {p.talent_skills.length > 0 && (
            <section className="mt-10 border-t border-border-base pt-8">
              <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
              <TagList
                className="mt-3"
                label="Skills"
                tags={p.talent_skills
                  .map((s) => s.skills?.name)
                  .filter((n): n is string => Boolean(n))
                  .map((name) => ({ name }))}
              />
            </section>
          )}

          <div className="mt-10 border-t border-border-base pt-8">
            <PortfolioSection websiteUrl={p.website_url} items={items} isOwner={isOwner} />
          </div>
        </div>
      </div>
    </main>
  );
}
