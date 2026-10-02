import { ArrowLeft } from '@phosphor-icons/react/ssr';
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
import { GitHubIcon, LinkedInIcon } from '@/components/shared/brand-icons';
import { formatMonth } from '@/components/talent/history-format';
import { siteUrl } from '@/lib/env';
import { AVAILABILITY_LABEL, getTalentBySlug } from '@/lib/services/talent';
import { createClient } from '@/lib/supabase/server';
import { getClientProfileId, getViewer } from '@/lib/supabase/session';

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
  // Only while ACTING as a client (active_role), not merely owning a client profile.
  const viewer = await getViewer();
  if (viewer?.activeRole === 'client' && !isOwner && p.is_published && p.accepts_messages) {
    const clientId = await getClientProfileId();
    if (clientId) {
      const { data: openJobs } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('client_id', clientId)
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
  // Most recent first: current roles (no end date), then by start date.
  const experience = [...(p.talent_experience ?? [])].sort(
    (a, b) =>
      Number(a.end_date !== null) - Number(b.end_date !== null) ||
      b.start_date.localeCompare(a.start_date),
  );
  const education = [...(p.talent_education ?? [])].sort(
    (a, b) => (b.end_year ?? 9999) - (a.end_year ?? 9999),
  );
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
    <div className="mx-auto w-full flex-1 py-8 sm:py-12">
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

      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/browse?type=developers"
          className="-ml-1 inline-flex h-10 items-center gap-1.5 rounded-md px-1 font-medium text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All developers
        </Link>
      </nav>

      {!p.is_published && isOwner && (
        <p
          role="status"
          className="mb-8 rounded-lg border border-warning/40 bg-warning-subtle px-4 py-3 text-sm text-text"
        >
          This is a draft. Only you can see it.{' '}
          <Link href="/onboarding/talent/review" className="prose-link font-semibold">
            Finish and publish
          </Link>
        </p>
      )}

      {/* Same single-aside grid as the job page: header → facts → body in DOM order. Below lg
          it is one column, so the facts panel sits between the header and the bio. */}
      <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <header className="min-w-0 lg:col-start-1">
          <Avatar name={p.headline} size="lg" />
          <h1 className="mt-5 text-display-sm text-balance sm:text-display-md">{p.headline}</h1>
          {hasLinks && (
            <p className="mt-4 flex gap-2">
              {/* Linked accounts as icons; the text name is kept for screen readers. */}
              <ExternalLink
                href={p.github_url}
                bare
                className="pressable grid size-10 place-items-center rounded-md border border-control bg-surface-raised text-text-muted hover:bg-surface-sunken hover:text-text"
              >
                <GitHubIcon />
                <span className="sr-only">GitHub</span>
              </ExternalLink>
              <ExternalLink
                href={p.linkedin_url}
                bare
                className="pressable grid size-10 place-items-center rounded-md border border-control bg-surface-raised text-text-muted hover:bg-surface-sunken hover:text-text"
              >
                <LinkedInIcon />
                <span className="sr-only">LinkedIn</span>
              </ExternalLink>
            </p>
          )}
        </header>

        <aside aria-label="Profile details" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* The one raised panel on the page: the facts a client decides on, and the action. */}
          <div className="rounded-lg border border-border-base bg-surface-raised p-5 lg:sticky lg:top-8">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 min-[26rem]:grid-cols-2 lg:grid-cols-1">
              {facts.map(([term, value]) => (
                <div key={term} className="min-w-0">
                  <dt className="text-sm text-text-muted">{term}</dt>
                  <dd className="mt-0.5 font-semibold break-words text-text">{value}</dd>
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
            <p className="max-w-prose text-lg leading-relaxed whitespace-pre-line text-text text-pretty">
              {p.bio}
            </p>
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

          {experience.length > 0 && (
            <section className="mt-10 border-t border-border-base pt-8">
              <h2 className="text-lg font-semibold tracking-tight">Experience</h2>
              <ol className="mt-4 space-y-5">
                {experience.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">
                      {e.role} <span className="font-normal text-text-muted">· {e.company}</span>
                    </p>
                    <p className="text-sm text-text-muted tabular-nums">
                      {formatMonth(e.start_date)} -{' '}
                      {e.end_date ? formatMonth(e.end_date) : 'Present'}
                    </p>
                    {e.description && (
                      <p className="mt-1.5 whitespace-pre-line text-text-muted text-pretty">
                        {e.description}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {education.length > 0 && (
            <section className="mt-10 border-t border-border-base pt-8">
              <h2 className="text-lg font-semibold tracking-tight">Education</h2>
              <ul className="mt-4 space-y-4">
                {education.map((e) => (
                  <li key={e.id}>
                    <p className="font-semibold">{e.school}</p>
                    <p className="text-sm text-text-muted tabular-nums">
                      {[e.degree, [e.start_year, e.end_year].filter(Boolean).join(' - ')]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
