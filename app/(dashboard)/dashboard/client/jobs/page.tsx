import { Briefcase, Copy, PencilSimple as Pencil, Plus } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

import { JobStatusBadge } from '@/components/job/job-status-badge';
import { formatRange } from '@/components/shared/money';
import { Skeleton } from '@/components/shared/skeleton';
import { ActionForm } from '@/components/ui/action-form';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SubmitButton } from '@/components/ui/submit-button';
import { THead, Table, Td, Th } from '@/components/ui/table';
import { closeJob, duplicateJob, reopenJob } from '@/lib/actions/jobs';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'My jobs' };

type JobRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  budget: string | null;
  applications: number;
  created: string;
};

/**
 * Every brief this client has written.
 *
 * A TABLE on wide screens, because these rows are compared column by column (status, how many
 * applied, budget). Below xl it is a LIST in one panel: the sidebar takes 15rem at lg, and at
 * that width a five-column table with three actions per row would squeeze the title column to
 * a few characters or scroll sideways and hide the actions off the edge. Same data, same
 * actions, one rendered at a time.
 *
 * Close and reopen confirm with a toast: the row changes state in place and nothing else on the
 * page moves, so the confirmation is easy to miss. Duplicate navigates to the new draft, and the
 * navigation is its own confirmation.
 *
 * LOADING — the rows stream behind a skeleton of the same shape. A loading.tsx cannot be used:
 * it would also wrap jobs/[id], which has a notFound() (see ../saved/loading.tsx).
 */
export default async function ClientJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div>
      <PageHeader
        title="My jobs"
        subtitle="Every brief you've written, published or not."
        actions={
          <Link href="/dashboard/client/jobs/new" className={buttonStyles()}>
            <Plus aria-hidden="true" />
            Post a job
          </Link>
        }
      />
      <Suspense fallback={<JobsSkeleton />}>
        <JobsBody userId={user.id} />
      </Suspense>
    </div>
  );
}

async function JobsBody({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: jobs } = client
    ? await supabase
        .from('jobs')
        .select(
          'id, title, slug, status, budget_min, budget_max, currency, engagement_type, created_at',
        )
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    : { data: null };

  // One query for all counts rather than one per job: the N+1 the plan says to keep out.
  const { data: counts } = jobs?.length
    ? await supabase
        .from('applications')
        .select('job_id, status')
        .in(
          'job_id',
          jobs.map((j) => j.id),
        )
    : { data: [] };

  const applicationCount = new Map<string, number>();
  for (const a of counts ?? []) {
    if (a.status === 'withdrawn') continue;
    applicationCount.set(a.job_id, (applicationCount.get(a.job_id) ?? 0) + 1);
  }

  const rows: JobRow[] = (jobs ?? []).map((job) => ({
    id: job.id,
    title: job.title,
    slug: job.slug,
    status: job.status,
    budget: formatRange(
      job.budget_min,
      job.budget_max,
      job.currency,
      job.engagement_type === 'hourly' ? '/hr' : '',
    ),
    applications: applicationCount.get(job.id) ?? 0,
    created: job.created_at,
  }));

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No jobs yet"
        body="Use Post a job to write your first brief. We rank developers against the work they have actually shipped, so you can also look around first."
        action={
          <Link
            href="/browse?type=developers"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            Browse developers
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="hidden xl:block">
        <Table label="Your jobs">
          <THead>
            <tr>
              <Th>Job</Th>
              <Th>Status</Th>
              <Th className="text-right">Applications</Th>
              <Th>Budget</Th>
              <Th>
                <span className="sr-only">Actions</span>
              </Th>
            </tr>
          </THead>
          <tbody>
            {rows.map((job) => (
              <tr
                key={job.id}
                className="transition-colors duration-fast hover:bg-surface-sunken/40"
              >
                <Td className="max-w-md">
                  <Link
                    href={`/dashboard/client/jobs/${job.id}`}
                    className="font-semibold hover:underline"
                  >
                    {job.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-subtle">
                    Posted <Posted date={job.created} />
                  </p>
                </Td>
                <Td>
                  <JobStatusBadge status={job.status} />
                </Td>
                <Td className="text-right font-semibold tabular-nums">{job.applications}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {job.budget ?? <span className="text-text-subtle">Not set</span>}
                </Td>
                <Td className="py-2.5 align-middle">
                  <JobActions job={job} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <ul
        aria-label="Your jobs"
        className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised xl:hidden"
      >
        {rows.map((job) => (
          <li key={job.id} className="px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/dashboard/client/jobs/${job.id}`}
                className="min-w-0 font-semibold break-words hover:underline"
              >
                {job.title}
              </Link>
              <JobStatusBadge status={job.status} />
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-text-subtle">Applications</dt>
                <dd className="font-semibold tabular-nums">{job.applications}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-text-subtle">Budget</dt>
                <dd className="tabular-nums">{job.budget ?? 'Not set'}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-text-subtle">Posted</dt>
                <dd className="tabular-nums">
                  <Posted date={job.created} />
                </dd>
              </div>
            </dl>
            <div className="mt-3 -mr-2 sm:mr-0">
              <JobActions job={job} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function Posted({ date }: { date: string }) {
  return (
    <time dateTime={date}>
      {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
    </time>
  );
}

/** 40px tall on phones, where these are tapped; the compact 36px from sm up. */
const TAP = 'min-h-10 sm:min-h-0';

function JobActions({ job }: { job: JobRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 xl:flex-nowrap">
      <Link
        href={`/dashboard/client/jobs/${job.id}/edit`}
        className={buttonStyles({ variant: 'ghost', size: 'sm', className: TAP })}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>
      <form action={duplicateJob}>
        <input type="hidden" name="jobId" value={job.id} />
        <SubmitButton variant="ghost" size="sm" className={TAP} pendingLabel="Copying…">
          <Copy aria-hidden="true" />
          Duplicate
        </SubmitButton>
      </form>
      {job.status === 'open' && (
        // Closed, not deleted: applicants keep their record of it (flows §7).
        <ActionForm action={closeJob} success={`Closed “${job.title}”`}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="ghost" size="sm" className={TAP} pendingLabel="Closing…">
            Close
          </SubmitButton>
        </ActionForm>
      )}
      {job.status === 'closed' && (
        <ActionForm action={reopenJob} success={`Reopened “${job.title}”`}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="ghost" size="sm" className={TAP} pendingLabel="Reopening…">
            Reopen
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

/** The list shape (what most widths show): title and badge, a facts line, the actions. */
function JobsSkeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading your jobs"
      className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="space-y-3 px-4 py-4 sm:px-5">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-5 w-3/5" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-4 w-2/3" />
          <div className="flex justify-end gap-2">
            <Skeleton className="h-9 w-16 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
