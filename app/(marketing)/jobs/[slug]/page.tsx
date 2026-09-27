import type { Metadata } from 'next';

import { jsonLdScript } from '@/lib/seo/json-ld';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ExternalLink } from '@/components/shared/external-link';
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

  const applyState = await resolveApplyState(job.id, closed || expired);

  return (
    <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <script
        type="application/ld+json"
        // Only emitted while the posting is genuinely open. Structured data for a job nobody
        // can apply to is what gets a site demoted in Google Jobs (§9).
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(closed || expired ? {} : jobPostingJsonLd(job, siteUrl())),
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
          className="mb-6 rounded-md border border-border-strong bg-surface-sunken p-3 text-sm"
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
        <section className="mt-8 rounded-md border border-border-base bg-surface-raised p-5">
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

      <div className="mt-8 border-t border-border-base pt-6">
        <ApplySection state={applyState} jobId={job.id} jobTitle={job.title} slug={job.slug} />
      </div>
    </main>
  );
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
