import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExternalLink } from '@/components/shared/external-link';
import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { siteUrl } from '@/lib/env';
import { jobPostingJsonLd } from '@/lib/seo/job-posting';
import { getJobBySlug } from '@/lib/services/jobs';
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

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <script
        type="application/ld+json"
        // Only emitted while the posting is genuinely open. Structured data for a job nobody
        // can apply to is what gets a site demoted in Google Jobs (§9).
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(closed || expired ? {} : jobPostingJsonLd(job, siteUrl())),
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/jobs" className="text-text-muted hover:text-text">
          ← All jobs
        </Link>
      </nav>

      {(closed || expired) && (
        <p
          role="status"
          className="mb-6 rounded-[--radius] border border-border-strong bg-surface-sunken p-3 text-sm"
        >
          {closed ? 'This job is closed.' : 'The deadline for this job has passed.'} It stays
          visible so existing applicants keep their record of it.
        </p>
      )}

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{job.title}</h1>
        <p className="mt-2 text-text-muted">
          {job.client_profiles?.company_name ?? 'A client'}
          {job.client_profiles?.industry ? ` · ${job.client_profiles.industry}` : ''}
        </p>

        <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {budget && (
            <div>
              <dt className="text-text-subtle">Budget</dt>
              <dd className="font-medium tabular-nums">{budget}</dd>
            </div>
          )}
          <div>
            <dt className="text-text-subtle">Engagement</dt>
            <dd className="font-medium">{ENGAGEMENT_LABEL[job.engagement_type]}</dd>
          </div>
          <div>
            <dt className="text-text-subtle">Location</dt>
            <dd className="font-medium">
              {LOCATION_LABEL[job.location_type]}
              {job.location ? ` — ${job.location}` : ''}
            </dd>
          </div>
          {job.experience_level && (
            <div>
              <dt className="text-text-subtle">Level</dt>
              <dd className="font-medium capitalize">{job.experience_level}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="mt-8">
        <h2 className="sr-only">Description</h2>
        <p className="whitespace-pre-line text-pretty leading-relaxed">{job.description}</p>
        {job.requirements && (
          <>
            <h3 className="mt-6 font-medium">Requirements</h3>
            <p className="mt-1 whitespace-pre-line text-text-muted text-pretty">
              {job.requirements}
            </p>
          </>
        )}
      </section>

      {(required.length > 0 || niceToHave.length > 0) && (
        <section className="mt-8">
          <h2 className="font-medium">Skills</h2>
          {required.length > 0 && (
            <>
              <p className="mt-2 text-sm text-text-subtle">Required</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {required.map((s) => (
                  <li
                    key={s.skills?.slug}
                    className="rounded-full bg-accent-subtle px-2.5 py-0.5 text-sm"
                  >
                    {s.skills?.name}
                  </li>
                ))}
              </ul>
            </>
          )}
          {niceToHave.length > 0 && (
            <>
              <p className="mt-3 text-sm text-text-subtle">Nice to have</p>
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {niceToHave.map((s) => (
                  <li
                    key={s.skills?.slug}
                    className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-sm text-text-muted"
                  >
                    {s.skills?.name}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      {job.client_profiles?.about && (
        <section className="mt-8 rounded-[--radius] border border-border-base bg-surface-raised p-5">
          <h2 className="font-medium">About {job.client_profiles.company_name}</h2>
          <p className="mt-1.5 text-sm text-text-muted text-pretty">{job.client_profiles.about}</p>
          {job.client_profiles.website && (
            <p className="mt-2 text-sm">
              <ExternalLink href={job.client_profiles.website} className="text-accent">
                {job.client_profiles.website.replace(/^https:\/\//, '')}
              </ExternalLink>
            </p>
          )}
        </section>
      )}

      {!closed && !expired && (
        <div className="mt-8 border-t border-border-base pt-6">
          {/* The apply flow lands next; the button is deliberately not rendered yet rather
              than rendered dead. A button that does nothing is worse than no button. */}
          <p className="text-sm text-text-muted">
            Applying opens in the next release.{' '}
            <Link href="/signup" className="text-accent hover:underline">
              Create a profile
            </Link>{' '}
            so you&rsquo;re ready.
          </p>
        </div>
      )}
    </main>
  );
}
