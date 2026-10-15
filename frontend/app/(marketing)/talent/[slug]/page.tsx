import { ArrowLeft, Flag, SealCheck } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';

import { jsonLdScript } from '@techselect/backend/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ContactDialog } from '@/components/messaging/contact-dialog';
import { ReportDialog } from '@/components/messaging/thread-actions';
import { Button } from '@/components/ui/button';
import { ExternalLink } from '@/components/shared/external-link';
import { Avatar } from '@/components/ui/avatar';
import { Badge, TagList } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { formatRange } from '@/components/shared/money';
import { PortfolioSection } from '@/components/portfolio/portfolio-section';
import { GitHubIcon, LinkedInIcon } from '@/components/shared/brand-icons';
import { certificationDates, formatMonth } from '@techselect/backend/talent/history-format';
import { siteUrl } from '@techselect/backend/env';
import { AVAILABILITY_LABEL, getTalentBySlug } from '@techselect/backend/services/talent';
import { createClient } from '@techselect/backend/supabase/server';
import { cn } from '@/lib/ui/cn';
import { getClientProfileId, getViewer } from '@techselect/backend/supabase/session';

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
  // would confirm the profile exists.
  if (!p.is_published && !isOwner) notFound();

  const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
  const items = [...(p.portfolio_items ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  // The first eight skills, up top; the full list stays in its own section below.
  const topSkills = p.talent_skills
    .flatMap((s) => (s.skills?.name ? [s.skills.name] : []))
    .slice(0, 8);
  // Most recent first: current roles (no end date), then by start date.
  const experience = [...(p.talent_experience ?? [])].sort(
    (a, b) =>
      Number(a.end_date !== null) - Number(b.end_date !== null) ||
      b.start_date.localeCompare(a.start_date),
  );
  // Newest first. Expired ones stay, labelled: it is still true that the person earned them.
  const certifications = [...(p.talent_certifications ?? [])].sort((a, b) =>
    b.issued_on.localeCompare(a.issued_on),
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
  // Only connected accounts are shown (migration 0021): a GitHub or LinkedIn link on a profile
  // is one its owner signed in to prove. Typed links from before connecting stay stored, unshown.
  const github = p.github_connected_at ? p.github_url : null;
  const linkedin = p.linkedin_connected_at ? p.linkedin_url : null;
  const hasLinks = github || linkedin;

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
                    sameAs: [p.website_url, github, linkedin].filter(Boolean),
                    knowsAbout: p.talent_skills.map((s) => s.skills?.name).filter(Boolean),
                    // schema.org's credential type; lets search engines read the certifications
                    // the page already shows.
                    hasCredential: (p.talent_certifications ?? []).map((c) => ({
                      '@type': 'EducationalOccupationalCredential',
                      name: c.name,
                      recognizedBy: { '@type': 'Organization', name: c.issuer },
                      ...(c.verification_url ? { url: c.verification_url } : {}),
                      ...(c.expires_on ? { expires: c.expires_on } : {}),
                    })),
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
        <p role="status" className="mb-8 rounded-lg bg-warning-subtle px-4 py-3 text-sm text-text">
          This is a draft. Only you can see it.{' '}
          <Link href="/onboarding/talent/review" className="prose-link font-semibold">
            Finish and publish
          </Link>
        </p>
      )}

      {/* Same single-aside grid as the job page: header → facts → body in DOM order. Below lg
          it is one column, so the facts panel sits between the header and the bio. */}
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        {/* The first screen answers a client's three questions at once: who (photo and
            headline), on what terms (rate and availability, beside the name), and with what
            (the top skills), before the work itself below. */}
        <header className="min-w-0 lg:col-start-1">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
            <Avatar name={p.headline} src={p.avatar_url} size="xl" />
            <div className="min-w-0">
              <h1 className="max-w-[24ch] text-display-sm text-balance">{p.headline}</h1>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {rate && (
                  <li className="inline-flex items-center rounded-full bg-primary-subtle px-3 py-1 font-semibold text-primary tabular-nums">
                    {rate}
                  </li>
                )}
                <li className="inline-flex items-center gap-1.5 rounded-full border border-border-base bg-surface-raised px-3 py-1 text-text-muted">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'size-2 rounded-full',
                      p.availability === 'unavailable' ? 'bg-text-subtle' : 'bg-success',
                    )}
                  />
                  {AVAILABILITY_LABEL[p.availability] ?? p.availability}
                </li>
                {p.years_experience ? (
                  <li className="inline-flex items-center rounded-full border border-border-base bg-surface-raised px-3 py-1 text-text-muted">
                    {p.years_experience} {p.years_experience === 1 ? 'year' : 'years'}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          {topSkills.length > 0 && (
            <TagList
              className="mt-6"
              label="Top skills"
              tags={topSkills.map((name) => ({ name }))}
            />
          )}
          {hasLinks && (
            <p className="mt-4 flex flex-wrap gap-2">
              {/* Connected accounts: brand icon, name, and a "Connected" mark, so a client can
                  tell these were signed in to, not typed (migration 0021). */}
              {(
                [
                  [github, 'GitHub', <GitHubIcon key="gh" />],
                  [linkedin, 'LinkedIn', <LinkedInIcon key="li" />],
                ] as const
              ).map(([href, label, icon]) =>
                href ? (
                  <ExternalLink
                    key={label}
                    href={href}
                    bare
                    className="pressable inline-flex min-h-10 items-center gap-2 rounded-md border border-control bg-surface-raised px-3 text-sm font-medium text-text hover:bg-surface-sunken"
                  >
                    {icon}
                    {label}
                    <span className="inline-flex items-center gap-1 text-xs font-normal text-success">
                      <SealCheck aria-hidden="true" size={14} weight="fill" />
                      Connected
                    </span>
                  </ExternalLink>
                ) : null,
              )}
            </p>
          )}
        </header>

        <aside aria-label="Profile details" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* The one raised panel on the page: the facts a client decides on, and the action. */}
          <div className="rounded-lg border border-border-base bg-surface-raised p-6 lg:sticky lg:top-24">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 min-[26rem]:grid-cols-2 lg:grid-cols-1">
              {facts.map(([term, value]) => (
                <div key={term} className="min-w-0">
                  <dt className="font-mono text-xs text-text-subtle">{term}</dt>
                  <dd className="mt-1 font-medium break-words text-text">{value}</dd>
                </div>
              ))}
            </dl>
            {contactJobs !== null && (
              <div className="mt-6 border-t border-border-base pt-5 [&_button]:w-full">
                <ContactDialog talentId={p.id} talentHeadline={p.headline} jobs={contactJobs} />
              </div>
            )}
            {/* Said rather than silently missing: a client looking for the button should learn
                why it is not there. */}
            {viewer?.activeRole === 'client' &&
              !isOwner &&
              p.is_published &&
              !p.accepts_messages && (
                <p className="mt-6 border-t border-border-base pt-5 text-sm text-text-muted text-pretty">
                  Not taking new messages right now.
                </p>
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
            {/* Anyone signed in can report a profile (reports, migration 0000). Not shown to
                its owner, nor to signed-out visitors, who have no account to report from. */}
            {user && !isOwner && (
              <div className="mt-4 flex justify-center">
                <ReportDialog
                  subjectType="profile"
                  subjectId={p.id}
                  subjectLabel="this profile"
                  trigger={
                    <Button variant="ghost" size="sm" className="text-text-muted">
                      <Flag aria-hidden="true" />
                      Report this profile
                    </Button>
                  }
                />
              </div>
            )}
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          {/* The work leads (the redesign brief: portfolio is the visual hero of a profile); the
              bio, skills and history follow it as supporting detail. */}
          <PortfolioSection websiteUrl={p.website_url} items={items} isOwner={isOwner} />

          {p.bio && (
            <section
              aria-labelledby="about-heading"
              className="mt-14 border-t border-border-base pt-10"
            >
              <h2 id="about-heading" className="text-xl font-semibold tracking-tight">
                About
              </h2>
              <p className="mt-4 max-w-prose text-lg leading-relaxed whitespace-pre-line text-text">
                {p.bio}
              </p>
            </section>
          )}

          {/* The full list only when the header could not show them all. */}
          {p.talent_skills.length > topSkills.length && (
            <section className="mt-14 border-t border-border-base pt-10">
              <h2 className="text-xl font-semibold tracking-tight">All skills</h2>
              <TagList
                className="mt-3"
                label="All skills"
                tags={p.talent_skills
                  .map((s) => s.skills?.name)
                  .filter((n): n is string => Boolean(n))
                  .map((name) => ({ name }))}
              />
            </section>
          )}

          {experience.length > 0 && (
            <section className="mt-14 border-t border-border-base pt-10">
              <h2 className="text-xl font-semibold tracking-tight">Experience</h2>
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

          {certifications.length > 0 && (
            <section
              aria-labelledby="certifications-heading"
              className="mt-14 border-t border-border-base pt-10"
            >
              <h2 id="certifications-heading" className="text-xl font-semibold tracking-tight">
                Certifications
              </h2>
              <ul className="mt-4 space-y-5">
                {certifications.map((c) => {
                  const dates = certificationDates(c.issued_on, c.expires_on);
                  return (
                    <li key={c.id}>
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                        {c.name}
                        {dates.expired && <Badge tone="outline">Expired</Badge>}
                      </p>
                      <p className="text-sm text-text-muted tabular-nums">
                        {c.issuer} · {dates.text}
                      </p>
                      {(c.credential_id || c.verification_url) && (
                        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          {c.credential_id && (
                            <span className="text-text-subtle">
                              Credential ID{' '}
                              <span className="font-mono text-text-muted">{c.credential_id}</span>
                            </span>
                          )}
                          {c.verification_url && (
                            <ExternalLink
                              href={c.verification_url}
                              className="inline-flex min-h-10 items-center font-semibold text-link"
                            >
                              Verify
                              <span className="sr-only"> {c.name}</span>
                            </ExternalLink>
                          )}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {education.length > 0 && (
            <section className="mt-14 border-t border-border-base pt-10">
              <h2 className="text-xl font-semibold tracking-tight">Education</h2>
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
