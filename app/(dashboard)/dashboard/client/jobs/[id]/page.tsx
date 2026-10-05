import {
  ArrowLeft,
  CaretRight as ChevronRight,
  CheckCircle,
  Hourglass,
  Tray as Inbox,
  MagnifyingGlassMinus as SearchX,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';

import { CandidateList } from '@/components/application/candidate-list';
import { ActionForm } from '@/components/ui/action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { fillJob } from '@/lib/actions/jobs';
import { SuggestedList } from '@/components/application/suggested-list';
import { Skeleton } from '@/components/shared/skeleton';
import { rankApplicants, suggestedForJob } from '@/lib/services/matches';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { buttonStyles } from '@/components/ui/button';
import { JobStatusBadge } from '@/components/job/job-status-badge';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Applications' };

type OwnJob = { id: string; title: string; slug: string; status: string };

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
   * `jobs_select_open_or_own` reads `status <> 'draft' OR owner`, which is correct for a
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

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link
          href="/dashboard/client/jobs"
          className="-ml-1 inline-flex min-h-10 items-center gap-1.5 rounded-md px-1 text-sm text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All jobs
        </Link>
      </nav>

      <PageHeader
        title={job.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <JobStatusBadge status={job.status} />
            {job.status !== 'draft' && (
              <Link href={`/jobs/${job.slug}`} className="prose-link text-sm">
                View public page
              </Link>
            )}
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

      {/*
        Streamed AFTER the ownership check above, so a missing or foreign job is still a real
        404. The ranking and the suggestions are the slow part of this page; the title, status
        and Edit button do not wait for them.
      */}
      <Suspense fallback={<ApplicantsSkeleton />}>
        <Applicants job={job} />
      </Suspense>
    </div>
  );
}

async function Applicants({ job }: { job: OwnJob }) {
  const supabase = await createClient();

  const { data: applications } = await supabase
    .from('applications')
    .select(
      `id, talent_id, status, cover_note, created_at,
       talent_profiles ( slug, headline, portfolio_item_count, website_url, accepts_messages, avatar_url )`,
    )
    .eq('job_id', job.id)
    .order('created_at', { ascending: false });

  const rows = (applications ?? []) as unknown as Parameters<typeof CandidateList>[0]['candidates'];

  /**
   * Order applicants by fit and attach the reason. Applications arrive in the order people
   * happened to apply, which is noise: a client reads the first three, so putting the best
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

  // Hired someone, job still open: offer to close it as filled, so new applications stop and it
  // leaves search. An offer, not automatic: some clients hire more than one person per brief.
  const hiredWhileOpen = job.status === 'open' && ranked.some((r) => r.status === 'hired');

  return (
    <>
      {hiredWhileOpen && (
        <ActionForm
          action={fillJob}
          success="Job marked as filled"
          className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-success-subtle p-4"
        >
          <input type="hidden" name="jobId" value={job.id} />
          <p className="flex min-w-0 flex-1 items-start gap-3 text-sm text-text text-pretty">
            <CheckCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
            <span>
              <strong className="font-semibold">You hired someone for this job.</strong> Mark it as
              filled to stop new applications and take it out of search. If you are still hiring for
              it, leave it open.
            </span>
          </p>
          <SubmitButton pendingLabel="Marking…">Mark as filled</SubmitButton>
        </ActionForm>
      )}
      {/* One column until xl; the content area is too narrow for two readable ones before that. */}
      <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start">
        <section aria-labelledby="applicants-heading">
          <SectionHeading
            id="applicants-heading"
            title={
              <>
                Applicants{' '}
                <span className="font-normal text-text-subtle tabular-nums">{active.length}</span>
              </>
            }
            description="Best fit first, each with the reason. Never a score."
          />
          {active.length > 0 ? (
            <>
              <CandidateList candidates={active} job={{ id: job.id, title: job.title }} />
              {active.some((a) => !a.ranked) && (
                // Said plainly rather than hidden. An applicant with no ranking is unmeasured,
                // not poor: usually they applied since the last ranking was computed, and
                // silently sorting them last would read as a verdict.
                <p className="mt-3 text-sm text-text-subtle text-pretty">
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
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-md text-sm text-text-muted hover:text-text [&::-webkit-details-marker]:hidden">
                <ChevronRight
                  aria-hidden="true"
                  size={15}
                  className="transition-transform duration-fast ease-out group-open:rotate-90"
                />
                <span className="tabular-nums">{withdrawn.length} withdrawn</span>
              </summary>
              <div className="mt-3">
                <CandidateList candidates={withdrawn} job={{ id: job.id, title: job.title }} />
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

          {suggested.state === 'ready' && (
            <SuggestedList matches={suggested.matches} job={{ id: job.id, title: job.title }} />
          )}

          {suggested.state === 'pending' && (
            <EmptyState
              icon={Hourglass}
              tone="pending"
              title="Still working through this"
              body="We're matching this brief against every published profile. Results arrive within the hour."
            />
          )}

          {suggested.state === 'empty' && (
            // Story S4 again: say nothing fits rather than padding the list.
            <EmptyState
              icon={SearchX}
              title="Nobody strong enough yet"
              body="We'd rather show nothing than pad this with developers who don't fit. New profiles are published regularly."
            />
          )}

          {suggested.state === 'too-sparse' && (
            <EmptyState
              title="Not enough in the brief to match on"
              body="Matching reads the description and required skills. A fuller description gets better suggestions, and it is the same text a developer reads before deciding to apply."
              action={
                <Link
                  href={`/dashboard/client/jobs/${job.id}/edit`}
                  className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                >
                  Edit job
                </Link>
              }
            />
          )}
        </section>
      </div>
    </>
  );
}

/** Two applicant cards, then the suggestions panel: the shape of the page once it lands. */
function ApplicantsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading applicants"
      className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] xl:items-start"
    >
      <div>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div
              key={i}
              className="space-y-3 rounded-lg border border-border-base bg-surface-raised p-4 sm:p-5"
            >
              <div className="flex justify-between gap-3">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex gap-2 border-t border-border-base pt-4">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-56 max-w-full" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="mt-4 divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3.5 px-5 py-4">
              <Skeleton className="size-10 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2 pt-0.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
