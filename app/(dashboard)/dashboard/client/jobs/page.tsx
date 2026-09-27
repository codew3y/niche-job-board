import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { formatRange } from '@/components/shared/money';
import { closeJob, duplicateJob, reopenJob } from '@/lib/actions/jobs';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Jobs' };

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-success/15 text-success',
  draft: 'bg-surface-sunken text-text-subtle',
  closed: 'bg-surface-sunken text-text-muted',
  filled: 'bg-accent-subtle text-accent',
};

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

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <PageHeader title="Jobs" subtitle="Every brief you've written, published or not." />
        <Link
          href="/dashboard/client/jobs/new"
          className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-text transition-colors duration-fast hover:bg-accent-hover"
        >
          Post a job
        </Link>
      </div>

      {jobs?.length ? (
        <ul className="divide-y divide-border-base rounded-md border border-border-base">
          {jobs.map((job) => {
            const n = applicationCount.get(job.id) ?? 0;
            const budget = formatRange(
              job.budget_min,
              job.budget_max,
              job.currency,
              job.engagement_type === 'hourly' ? '/hr' : '',
            );
            return (
              <li key={job.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-medium">
                      <Link href={`/dashboard/client/jobs/${job.id}`} className="hover:text-accent">
                        {job.title}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-sm text-text-subtle">
                      {n} {n === 1 ? 'application' : 'applications'}
                      {budget ? ` · ${budget}` : ''}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[job.status]}`}
                  >
                    {job.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/dashboard/client/jobs/${job.id}/edit`}
                    className="inline-flex h-9 items-center rounded-sm border border-border-strong px-3 text-sm transition-colors duration-fast hover:bg-surface-sunken"
                  >
                    Edit
                  </Link>
                  <form action={duplicateJob}>
                    <input type="hidden" name="jobId" value={job.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Duplicate
                    </Button>
                  </form>
                  {job.status === 'open' && (
                    <form action={closeJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      {/* Closed, not deleted: applicants keep their record of it (flows §7). */}
                      <Button type="submit" variant="ghost" size="sm" className="text-text-muted">
                        Close
                      </Button>
                    </form>
                  )}
                  {job.status === 'closed' && (
                    <form action={reopenJob}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        Reopen
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title="No briefs yet"
          body="Post one and we'll rank candidates against the work they've actually shipped."
          action={
            <Link
              href="/dashboard/client/jobs/new"
              className="text-accent underline underline-offset-2"
            >
              Post a job
            </Link>
          }
        />
      )}
    </div>
  );
}
