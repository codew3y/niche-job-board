import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Clock,
  Flag,
  Lock,
  MapPin,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { jsonLdScript } from '@/lib/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReportDialog } from '@/components/messaging/thread-actions';
import { ExternalLink } from '@/components/shared/external-link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/shared/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { siteUrl } from '@/lib/env';
import { jobPostingJsonLd } from '@/lib/seo/job-posting';
import { ApplySection, type ApplyState } from '@/components/application/apply-section';
import { getJobBySlug, openJobCount, similarJobs } from '@/lib/services/jobs';
import { JobMiniCard } from '@/components/job/job-mini-card';
import { createClient } from '@/lib/supabase/server';
import { getClientProfileId, getSessionUser, getViewer } from '@/lib/supabase/session';
import type { Job } from '@/lib/services/job-types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = (await getJobBySlug(slug)) as Job | null;
  if (!job) return { title: 'Job not found' };

  const company = job.client_profiles?.company_name;
  return {
    title: job.title,
    description: job.description.slice(0, 155),
    alternates: { canonical: `${siteUrl()}/jobs/${job.slug}` },
    openGraph: {
      title: `${job.title}${company ? ` · ${company}` : ''}`,
      description: job.description.slice(0, 200),
      type: 'article',
    },
  };
}

export default async function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = (await getJobBySlug(slug)) as Job | null;

  // RLS already hides other people's drafts, so a miss here is genuinely "not found".
  // 404 rather than 403 on a closed job too: a 403 confirms it exists (docs/api.md §4).
  if (!job || job.status === 'draft') notFound();

  const budget = formatRange(
    job.budget_min,
    job.budget_max,
    job.currency,
    job.engagement_type === 'hourly' ? '/hr' : '',
  );
  const required = job.job_skills.filter((s) => s.is_required);
  const niceToHave = job.job_skills.filter((s) => !s.is_required);
  const closed = job.status !== 'open';
  const expired = job.deadline ? new Date(job.deadline) < new Date() : false;

  const company = job.client_profiles?.company_name ?? 'A client';
  const posted = postedLabel(job.published_at);
  const facts = [
    budget
      ? [
          'Budget',
          <span key="b" className="tabular-nums">
            {budget}
          </span>,
        ]
      : null,
    ['Engagement', ENGAGEMENT_LABEL[job.engagement_type]],
    ['Location', `${LOCATION_LABEL[job.location_type]}${job.location ? `, ${job.location}` : ''}`],
    job.experience_level
      ? [
          'Level',
          <span key="l" className="capitalize">
            {job.experience_level}
          </span>,
        ]
      : null,
    job.deadline
      ? [
          'Deadline',
          new Date(job.deadline).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
        ]
      : null,
  ].filter(Boolean) as [string, React.ReactNode][];

  return (
    // A size container: this page renders inside the public site (up to 60rem of content) AND
    // inside the app shell (a sidebar takes 15rem), so the two-column layout keys off the width
    // it actually has, not the viewport. Below 48rem of content it is one column.
    <div className="@container mx-auto w-full flex-1 py-8 sm:py-12">
      <script
        type="application/ld+json"
        // Only emitted while the posting is genuinely open. Structured data for a job nobody
        // can apply to is what gets a site demoted in Google Jobs (§9).
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(closed || expired ? {} : jobPostingJsonLd(job, siteUrl())),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6">
        <Link
          href="/browse?type=jobs"
          className="-ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All jobs
        </Link>
      </nav>

      {(closed || expired) && (
        <p
          role="status"
          className="mb-8 flex gap-2.5 rounded-md border border-border-strong bg-surface-sunken px-4 py-3 text-sm text-pretty"
        >
          <Lock aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-text-subtle" />
          <span>
            {job.status === 'filled'
              ? 'This job has been filled.'
              : closed
                ? 'This job is closed.'
                : 'The deadline for this job has passed.'}{' '}
            It stays visible so existing applicants keep their record of it.
          </span>
        </p>
      )}

      {/*
        ONE apply block, placed by the grid rather than rendered twice. DOM order is header,
        facts, body, which is exactly the one-column order (the thing a visitor came to do sits
        above the brief). From 48rem of content the facts card moves to a sticky right column
        spanning both rows. Rendering it twice would run the apply-state queries twice and give
        assistive tech two copies of the same controls.
      */}
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 @3xl:grid-cols-[minmax(0,1fr)_20rem] @3xl:grid-rows-[auto_1fr]">
        <div className="min-w-0 @3xl:col-start-1">
          <header>
            <div className="flex items-center gap-3">
              <Avatar name={company} src={job.client_profiles?.logo_url} />
              <p className="min-w-0 text-sm text-text-muted">
                {job.client_profiles?.id ? (
                  <Link
                    href={`/company/${job.client_profiles.id}`}
                    className="prose-link font-semibold text-text"
                  >
                    {company}
                  </Link>
                ) : (
                  <span className="font-semibold text-text">{company}</span>
                )}
                {job.client_profiles?.industry ? ` · ${job.client_profiles.industry}` : ''}
              </p>
            </div>
            <h1 className="mt-5 font-semibold text-display-sm break-words text-balance sm:text-display-md">
              {job.title}
            </h1>
            {/* The terms a visitor scans for, under the title, before the brief itself. */}
            <ul className="mt-4 flex flex-wrap gap-2 text-sm text-text-muted">
              {[
                posted ? { icon: Clock, text: posted } : null,
                { icon: Briefcase, text: ENGAGEMENT_LABEL[job.engagement_type] },
                {
                  icon: MapPin,
                  text: `${LOCATION_LABEL[job.location_type]}${job.location ? `, ${job.location}` : ''}`,
                },
              ]
                .filter((f): f is { icon: typeof Clock; text: string } => Boolean(f?.text))
                .map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border-base bg-surface-raised px-3 py-1"
                  >
                    <Icon aria-hidden="true" size={14} className="text-text-subtle" />
                    {text}
                  </li>
                ))}
            </ul>
          </header>
        </div>

        <aside
          aria-label="Job details"
          className="@3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1"
        >
          <div className="@3xl:sticky @3xl:top-8">
            <FactsCard facts={facts}>
              <Suspense fallback={<Skeleton className="h-12 w-full rounded-md" />}>
                <ApplyBlock job={job} closed={closed || expired} />
              </Suspense>
            </FactsCard>
            <Suspense fallback={null}>
              <ReportJob jobId={job.id} ownerClientId={job.client_profiles?.id ?? null} />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0 @3xl:col-start-1">
          <section aria-labelledby="description-heading">
            <h2 id="description-heading" className="sr-only">
              Description
            </h2>
            <p className="max-w-[65ch] leading-relaxed whitespace-pre-line text-pretty sm:text-lg">
              {job.description}
            </p>
            {job.requirements && (
              <>
                <h3 className="mt-10 text-lg font-semibold tracking-tight">Requirements</h3>
                <p className="mt-2 max-w-[65ch] leading-relaxed whitespace-pre-line text-text-muted text-pretty">
                  {job.requirements}
                </p>
              </>
            )}
          </section>

          {(required.length > 0 || niceToHave.length > 0) && (
            <section
              aria-labelledby="skills-heading"
              className="mt-10 border-t border-border-base pt-8"
            >
              <h2 id="skills-heading" className="text-lg font-semibold tracking-tight">
                Skills
              </h2>
              {required.length > 0 && (
                <>
                  <h3 className="mt-4 text-sm font-semibold text-text-muted">Required</h3>
                  <TagList
                    className="mt-2"
                    label="Required skills"
                    tags={required.map((s) => ({ name: s.skills?.name ?? '', strong: true }))}
                  />
                </>
              )}
              {niceToHave.length > 0 && (
                <>
                  <h3 className="mt-5 text-sm font-semibold text-text-muted">Nice to have</h3>
                  <TagList
                    className="mt-2"
                    label="Nice-to-have skills"
                    tags={niceToHave.map((s) => ({ name: s.skills?.name ?? '' }))}
                  />
                </>
              )}
            </section>
          )}

          {job.client_profiles && (
            <Suspense fallback={null}>
              <ClientCard client={job.client_profiles} />
            </Suspense>
          )}
        </div>
      </div>

      <Suspense fallback={null}>
        <SimilarBriefs
          jobId={job.id}
          skillSlugs={job.job_skills.flatMap((s) => (s.skills?.slug ? [s.skills.slug] : []))}
        />
      </Suspense>
    </div>
  );
}

/** "Posted today", "Posted 3 days ago": how fresh the brief is, in words. */
function postedLabel(publishedAt: string | null) {
  if (!publishedAt) return null;
  const days = Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86_400_000);
  if (days <= 0) return 'Posted today';
  if (days === 1) return 'Posted yesterday';
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * Who the brief is from, always shown: the name and photo or logo, how many jobs they have open,
 * their line about the work and website when they wrote them, and a link to their page. Shown
 * even when the client wrote nothing else, so a brief never arrives from nobody.
 */
async function ClientCard({ client }: { client: NonNullable<Job['client_profiles']> }) {
  const open = await openJobCount(client.id);
  return (
    <section
      aria-labelledby="company-heading"
      className="mt-10 rounded-xl border border-border-base bg-surface-raised p-5 sm:p-6"
    >
      <div className="flex items-center gap-3">
        <Avatar name={client.company_name} src={client.logo_url} size="lg" />
        <div className="min-w-0">
          <p className="font-mono text-xs text-text-subtle">About the client</p>
          <h2 id="company-heading" className="truncate text-lg font-semibold tracking-tight">
            {client.company_name}
          </h2>
          <p className="text-sm text-text-muted">
            {[client.industry, `${open} open ${open === 1 ? 'job' : 'jobs'}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </div>
      {client.about && (
        <p className="mt-4 max-w-[65ch] text-sm leading-relaxed whitespace-pre-line text-text-muted text-pretty">
          {client.about}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={`/company/${client.id}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-link hover:underline"
        >
          {open > 1 ? `All ${open} open jobs` : 'Client page'}
          <ArrowRight aria-hidden="true" size={16} />
        </Link>
        {client.website && (
          <p className="text-sm break-all">
            <ExternalLink href={client.website} className="font-semibold">
              {client.website.replace(/^https:\/\//, '')}
            </ExternalLink>
          </p>
        )}
      </div>
    </section>
  );
}

/** Other open briefs under the job, so the page never ends on a dead end. */
async function SimilarBriefs({ jobId, skillSlugs }: { jobId: string; skillSlugs: string[] }) {
  const jobs = await similarJobs(jobId, skillSlugs);
  if (!jobs.length) return null;
  return (
    <section aria-labelledby="similar-heading" className="mt-16 border-t border-border-base pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="similar-heading" className="text-xl font-semibold tracking-tight">
          Similar briefs
        </h2>
        <Link href="/browse?type=jobs" className="text-sm font-medium text-link hover:underline">
          Browse all jobs
        </Link>
      </div>
      <ul className="mt-6 grid gap-4 @2xl:grid-cols-3">
        {jobs.map((j) => (
          <li key={j.id}>
            <JobMiniCard job={j} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The one raised panel on the page: the terms at a glance and the apply control. It is a card
 * because it is the action surface; everything else is document.
 */
function FactsCard({
  facts,
  children,
}: {
  facts: [string, React.ReactNode][];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-base bg-surface-raised p-5 shadow-sm">
      {/* Phone: two columns. Mid-width single column layout: three. In the side column: one. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4 @xl:grid-cols-3 @3xl:grid-cols-1">
        {facts.map(([term, value]) => (
          <div key={term} className="min-w-0">
            <dt className="font-mono text-xs text-text-subtle">{term}</dt>
            <dd className="mt-0.5 font-semibold break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 border-t border-border-base pt-5">{children}</div>
    </div>
  );
}

/**
 * The apply control, streamed. It needs the viewer's profile and any existing application —
 * several queries the rest of the page does not — so it resolves inside its own Suspense
 * boundary, AFTER the page has passed its notFound() check (a missing job is still a real 404).
 */
async function ApplyBlock({ job, closed }: { job: Job; closed: boolean }) {
  const applyState = await resolveApplyState(job.id, closed);
  return <ApplySection state={applyState} jobId={job.id} jobTitle={job.title} slug={job.slug} />;
}

/**
 * Which apply branch this visitor is in.
 *
 * Read server-side so the page ships the right state in the HTML rather than flashing a
 * wrong one and correcting it on hydrate.
 */
async function resolveApplyState(jobId: string, closed: boolean): Promise<ApplyState> {
  if (closed) return { kind: 'closed' };

  const viewer = await getViewer();
  if (!viewer) {
    // Signed in but no role yet reads as having no profile; signed out is signed out.
    return (await getSessionUser()) ? { kind: 'no-profile' } : { kind: 'signed-out' };
  }

  const supabase = await createClient();

  /**
   * The ACTIVE role decides the branch, not which profiles exist. A dual-role account browsing
   * as a client used to be offered "Apply", because it also owned a talent profile.
   */
  if (viewer.activeRole === 'client') {
    const clientId = await getClientProfileId();
    if (clientId) {
      const { data: ownsJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .eq('client_id', clientId)
        .maybeSingle();
      if (ownsJob) return { kind: 'own-job' };
    }
    return { kind: 'is-client' };
  }

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, is_published')
    .eq('user_id', viewer.userId)
    .maybeSingle();
  if (!profile) return { kind: 'no-profile' };

  const { data: existing } = await supabase
    .from('applications')
    .select('status')
    .eq('job_id', jobId)
    .eq('talent_id', profile.id)
    .maybeSingle();
  if (existing) return { kind: 'already-applied', status: existing.status };

  if (!profile.is_published) return { kind: 'unpublished' };
  return { kind: 'can-apply' };
}

/**
 * "Report this job", for anyone signed in who does not own it. Streamed, so the session lookup
 * never holds up the job itself.
 */
async function ReportJob({
  jobId,
  ownerClientId,
}: {
  jobId: string;
  ownerClientId: string | null;
}) {
  if (!(await getSessionUser())) return null;
  if (ownerClientId && (await getClientProfileId()) === ownerClientId) return null;
  return (
    <div className="mt-3 flex justify-center">
      <ReportDialog
        subjectType="job"
        subjectId={jobId}
        subjectLabel="this job"
        trigger={
          <Button variant="ghost" size="sm" className="text-text-muted">
            <Flag aria-hidden="true" />
            Report this job
          </Button>
        }
      />
    </div>
  );
}
