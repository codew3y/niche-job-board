import { ArrowLeft, Lock } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';

import { jsonLdScript } from '@/lib/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExternalLink } from '@/components/shared/external-link';
import { Skeleton } from '@/components/shared/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { siteUrl } from '@/lib/env';
import { jobPostingJsonLd } from '@/lib/seo/job-posting';
import { ApplySection, type ApplyState } from '@/components/application/apply-section';
import { getJobBySlug } from '@/lib/services/jobs';
import { createClient } from '@/lib/supabase/server';
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
  // 404 rather than 403 on a closed job too — a 403 confirms it exists (docs/api.md §4).
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
    ['Location', `${LOCATION_LABEL[job.location_type]}${job.location ? ` — ${job.location}` : ''}`],
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
    <main id="main" className="gutter mx-auto w-full max-w-6xl flex-1 py-8 sm:py-12">
      <script
        type="application/ld+json"
        // Only emitted while the posting is genuinely open. Structured data for a job nobody
        // can apply to is what gets a site demoted in Google Jobs (§9).
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(closed || expired ? {} : jobPostingJsonLd(job, siteUrl())),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All jobs
        </Link>
      </nav>

      {(closed || expired) && (
        <p
          role="status"
          className="mb-8 flex gap-2.5 rounded-lg border border-border-strong bg-surface-sunken px-4 py-3 text-sm"
        >
          <Lock aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-text-subtle" />
          <span>
            {closed ? 'This job is closed.' : 'The deadline for this job has passed.'} It stays
            visible so existing applicants keep their record of it.
          </span>
        </p>
      )}

      {/*
        ONE apply block, placed by the grid rather than rendered twice. DOM order is header →
        facts → body, which is exactly the phone order (the thing a visitor came to do sits
        above the brief). From lg the facts card moves to a sticky right column spanning both
        rows. Rendering it twice would run the apply-state queries twice and give assistive tech
        two copies of the same controls.
      */}
      <div className="grid gap-x-14 gap-y-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-[auto_1fr]">
        <div className="min-w-0 lg:col-start-1">
          <header>
            <div className="flex items-center gap-3">
              <Avatar name={company} />
              <p className="text-sm text-text-muted">
                <span className="font-medium text-text">{company}</span>
                {job.client_profiles?.industry ? ` · ${job.client_profiles.industry}` : ''}
              </p>
            </div>
            <h1 className="mt-5 font-serif text-display-md text-balance">{job.title}</h1>
          </header>
        </div>

        <aside aria-label="Job details" className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)]">
            <FactsCard facts={facts}>
              <Suspense fallback={<Skeleton className="h-12 w-full rounded-full" />}>
                <ApplyBlock job={job} closed={closed || expired} />
              </Suspense>
            </FactsCard>
          </div>
        </aside>

        <div className="min-w-0 lg:col-start-1">
          <section>
            <h2 className="sr-only">Description</h2>
            <p className="text-lg leading-relaxed whitespace-pre-line text-pretty">
              {job.description}
            </p>
            {job.requirements && (
              <>
                <h3 className="mt-10 text-lg font-semibold tracking-tight">Requirements</h3>
                <p className="mt-2 leading-relaxed whitespace-pre-line text-text-muted text-pretty">
                  {job.requirements}
                </p>
              </>
            )}
          </section>

          {(required.length > 0 || niceToHave.length > 0) && (
            <section className="mt-10 border-t border-border-base pt-8">
              <h2 className="text-lg font-semibold tracking-tight">Skills</h2>
              {required.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
                    Required
                  </p>
                  <TagList
                    className="mt-2"
                    label="Required skills"
                    tags={required.map((s) => ({ name: s.skills?.name ?? '', strong: true }))}
                  />
                </>
              )}
              {niceToHave.length > 0 && (
                <>
                  <p className="mt-5 text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
                    Nice to have
                  </p>
                  <TagList
                    className="mt-2"
                    label="Nice-to-have skills"
                    tags={niceToHave.map((s) => ({ name: s.skills?.name ?? '' }))}
                  />
                </>
              )}
            </section>
          )}

          {job.client_profiles?.about && (
            <section className="mt-10 rounded-lg border border-border-base bg-surface-raised p-6">
              <h2 className="font-semibold tracking-tight">
                About {job.client_profiles.company_name}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-muted text-pretty">
                {job.client_profiles.about}
              </p>
              {job.client_profiles.website && (
                <p className="mt-3 text-sm">
                  <ExternalLink href={job.client_profiles.website} className="font-medium">
                    {job.client_profiles.website.replace(/^https:\/\//, '')}
                  </ExternalLink>
                </p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

function FactsCard({
  facts,
  children,
}: {
  facts: [string, React.ReactNode][];
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-base bg-surface-raised p-5">
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { kind: 'signed-out' };

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, is_published')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    // No talent profile: either they are a client, or they have not started one.
    const { data: client } = await supabase
      .from('client_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (client) {
      const { data: ownsJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', jobId)
        .eq('client_id', client.id)
        .maybeSingle();
      if (ownsJob) return { kind: 'own-job' };
      return { kind: 'is-client' };
    }
    return { kind: 'no-profile' };
  }

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
