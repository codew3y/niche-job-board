import { ArrowLeft, ChevronRight, Hourglass, Inbox } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CandidateList } from '@/components/application/candidate-list';
import { SuggestedList } from '@/components/application/suggested-list';
import { rankApplicants, suggestedForJob } from '@/lib/services/matches';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { buttonStyles } from '@/components/ui/button';
import { JobStatusBadge } from '@/components/job/job-status-badge';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Applications' };

export default async function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /**
   * Ownership is checked HERE, explicitly. It is not implied by RLS.
   *
   * `jobs_select_open_or_own` reads `status <> 'draft' OR owner` — which is correct for a
   * public job board and means ANY authenticated user can select ANY open job by id. This
   * file used to carry a comment claiming RLS restricted jobs to their owner and rely on a
   * `if (!job) notFound()` that therefore never fired for an open job. A developer who had
   * applied could open the client-side management page for that job.
   *
   * Found by e2e/flows.spec.ts. Scoping the query to the viewer's own client profile is what
   * makes the 404 real.
   */
  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) notFound();

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, slug, status')
    .eq('id', id)
    .eq('client_id', client.id)
    .maybeSingle();
  // 404 rather than 403: a 403 confirms the job exists, which is itself a disclosure.
  if (!job) notFound();

  const { data: applications } = await supabase
    .from('applications')
    .select(
      `id, talent_id, status, cover_note, created_at,
       talent_profiles ( slug, headline, portfolio_item_count, website_url )`,
    )
    .eq('job_id', job.id)
    .order('created_at', { ascending: false });

  const rows = (applications ?? []) as unknown as Parameters<typeof CandidateList>[0]['candidates'];

  /**
   * Order applicants by fit and attach the reason. Applications arrive in the order people
   * happened to apply, which is noise — a client reads the first three, so putting the best
   * fit there is most of the value this product claims to add.
   */
  const ranked = await rankApplicants(
    job.id,
    rows.map((r) => ({ ...r, talentId: r.talent_id })),
  );

  const active = ranked.filter((r) => r.status !== 'withdrawn');
  const withdrawn = ranked.filter((r) => r.status === 'withdrawn');

  // People who fit and have not applied. Applicants are excluded because they appear above,
  // and showing someone twice makes the page look broken.
  const suggested = await suggestedForJob(
    job.id,
    rows.map((r) => r.talent_id),
  );

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-5 text-sm">
        <Link
          href="/dashboard/client/jobs"
          className="inline-flex items-center gap-1 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All jobs
        </Link>
      </nav>

      <PageHeader
        title={job.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <JobStatusBadge status={job.status} />
            <span>
              {active.length} {active.length === 1 ? 'application' : 'applications'}
            </span>
            <Link href={`/jobs/${job.slug}`} className="prose-link">
              View the public page
            </Link>
          </span>
        }
        actions={
          <Link
            href={`/dashboard/client/jobs/${job.id}/edit`}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Edit job
          </Link>
        }
      />

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
        <section aria-labelledby="applicants-heading">
          <SectionHeading
            id="applicants-heading"
            title="Applicants"
            description="Ordered by fit, with the reason — never a number on a person."
          />
          {active.length > 0 ? (
            <>
              <CandidateList candidates={active} />
              {active.some((a) => !a.ranked) && (
                // Said plainly rather than hidden. An applicant with no ranking is unmeasured,
                // not poor — usually they applied since the last ranking was computed — and
                // silently sorting them last would read as a verdict.
                <p className="mt-3 text-sm text-text-subtle">
                  Applicants without a reason haven&rsquo;t been assessed yet. That usually means
                  they applied recently; it updates within the hour.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              icon={Inbox}
              title="No applications yet"
              body="They'll appear here as they arrive, ordered by how well they fit, with the reason for each."
            />
          )}

          {withdrawn.length > 0 && (
            <details className="group mt-6">
              <summary className="cursor-pointer list-none text-sm text-text-muted hover:text-text [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">
                  <ChevronRight
                    aria-hidden="true"
                    size={15}
                    className="transition-transform duration-fast ease-out group-open:rotate-90"
                  />
                  {withdrawn.length} withdrawn
                </span>
              </summary>
              <div className="mt-3">
                <CandidateList candidates={withdrawn} />
              </div>
            </details>
          )}
        </section>

        <section aria-labelledby="suggested-heading">
          <SectionHeading
            id="suggested-heading"
            title="Developers who fit this brief"
            description="They haven’t applied. You can look at their work, or message them."
          />

          {suggested.state === 'ready' && <SuggestedList matches={suggested.matches} />}

          {suggested.state === 'pending' && (
            <EmptyState
              icon={Hourglass}
              tone="pending"
              title="Still working through this"
              body="We're matching this brief against every published profile. It lands within the hour — nothing is wrong."
            />
          )}

          {suggested.state === 'empty' && (
            // Story S4 again: say nothing fits rather than padding the list.
            <EmptyState
              title="Nobody strong enough yet"
              body="We'd rather show nothing than pad this with developers who don't fit. New profiles are published regularly."
            />
          )}

          {suggested.state === 'too-sparse' && (
            <EmptyState
              title="Not enough in the brief to match on"
              body="Matching reads the description and required skills. A fuller description gets better suggestions — it's the same text a developer reads before deciding to apply."
              action={
                <Link
                  href={`/dashboard/client/jobs/${job.id}/edit`}
                  className={buttonStyles({ size: 'sm' })}
                >
                  Edit the job
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
