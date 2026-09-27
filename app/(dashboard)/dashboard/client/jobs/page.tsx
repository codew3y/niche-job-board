import { Briefcase, Copy, Pencil, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { JobStatusBadge } from '@/components/job/job-status-badge';
import { formatRange } from '@/components/shared/money';
import { ActionForm } from '@/components/ui/action-form';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SubmitButton } from '@/components/ui/submit-button';
import { THead, Table, Td, Th } from '@/components/ui/table';
import { closeJob, duplicateJob, reopenJob } from '@/lib/actions/jobs';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Jobs' };

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
 * A TABLE on wide screens — these rows are compared column by column (status, how many applied,
 * budget) — and a list of cards on phones, where a five-column table would scroll sideways and
 * hide the actions off the edge. Same data, same actions, one rendered at a time.
 *
 * Close and reopen confirm with a toast: the row changes state in place and nothing else on the
 * page moves, so the confirmation is easy to miss. Duplicate navigates to the new draft, and the
 * navigation is its own confirmation.
 */
export default async function ClientJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
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

  // One query for all counts rather than one per job — the N+1 the plan says to keep out.
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

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Every brief you've written, published or not."
        actions={
          <Link href="/dashboard/client/jobs/new" className={buttonStyles({ variant: 'accent' })}>
            <Plus aria-hidden="true" />
            Post a job
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No briefs yet"
          body="Post one and we'll rank candidates against the work they've actually shipped."
          action={
            <Link href="/dashboard/client/jobs/new" className={buttonStyles({ size: 'sm' })}>
              Post a job
            </Link>
          }
        />
      ) : (
        <>
          <div className="hidden md:block">
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
                        className="font-medium hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-text-subtle">
                        Posted{' '}
                        <time dateTime={job.created}>
                          {new Date(job.created).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </time>
                      </p>
                    </Td>
                    <Td>
                      <JobStatusBadge status={job.status} />
                    </Td>
                    <Td className="text-right font-medium tabular-nums">{job.applications}</Td>
                    <Td className="whitespace-nowrap text-text-muted tabular-nums">
                      {job.budget ?? '—'}
                    </Td>
                    <Td>
                      <JobActions job={job} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map((job) => (
              <li
                key={job.id}
                className="rounded-lg border border-border-base bg-surface-raised p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/dashboard/client/jobs/${job.id}`}
                    className="font-medium hover:underline"
                  >
                    {job.title}
                  </Link>
                  <JobStatusBadge status={job.status} />
                </div>
                <p className="mt-1 text-sm text-text-subtle">
                  {job.applications} {job.applications === 1 ? 'application' : 'applications'}
                  {job.budget ? <span className="tabular-nums"> · {job.budget}</span> : ''}
                </p>
                <div className="mt-3 border-t border-border-base pt-3">
                  <JobActions job={job} />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function JobActions({ job }: { job: JobRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1 md:flex-nowrap">
      <Link
        href={`/dashboard/client/jobs/${job.id}/edit`}
        className={buttonStyles({ variant: 'ghost', size: 'sm' })}
      >
        <Pencil aria-hidden="true" />
        Edit
      </Link>
      <form action={duplicateJob}>
        <input type="hidden" name="jobId" value={job.id} />
        <SubmitButton variant="ghost" size="sm" pendingLabel="Copying…">
          <Copy aria-hidden="true" />
          Duplicate
        </SubmitButton>
      </form>
      {job.status === 'open' && (
        // Closed, not deleted: applicants keep their record of it (flows §7).
        <ActionForm action={closeJob} success={`Closed “${job.title}”`}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Closing…">
            Close
          </SubmitButton>
        </ActionForm>
      )}
      {job.status === 'closed' && (
        <ActionForm action={reopenJob} success={`Reopened “${job.title}”`}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="ghost" size="sm" pendingLabel="Reopening…">
            Reopen
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
