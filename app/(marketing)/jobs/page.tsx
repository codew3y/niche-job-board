import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { JobCard } from '@/components/job/job-card';
import { JobFilters } from '@/components/job/job-filters';
import { JobListSkeleton } from '@/components/shared/skeleton';
import { jobSearchParams } from '@/lib/schemas/search';
import { listJobs } from '@/lib/services/jobs';

export const metadata: Metadata = {
  title: 'Browse jobs',
  description:
    'Freelance software, web and automation briefs — filter by engagement, location and experience.',
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  // Parse rather than trust: query strings are user input like any other (§5.4).
  const parsed = jobSearchParams.safeParse(raw);
  const params = parsed.success ? parsed.data : jobSearchParams.parse({});

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Jobs</h1>
        <p className="mt-1 text-text-muted">
          Software, web and automation work. No AI needed to find it — search and filters do the
          job.
        </p>
      </header>

      <JobFilters />

      <Suspense
        key={JSON.stringify(raw)}
        fallback={
          <div className="mt-6">
            <JobListSkeleton />
          </div>
        }
      >
        <JobResults params={params} />
      </Suspense>
    </main>
  );
}

async function JobResults({ params }: { params: ReturnType<typeof jobSearchParams.parse> }) {
  const { jobs, nextCursor } = await listJobs(params);

  if (jobs.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          title="Nothing matches those filters"
          body="Try widening them — or clearing the search box. We'd rather show nothing than pad the list with jobs that don't fit."
        />
      </div>
    );
  }

  return (
    <>
      <p className="mt-6 text-sm text-text-subtle" aria-live="polite">
        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        {nextCursor ? ' on this page' : ''}
      </p>
      <div className="mt-2 overflow-hidden rounded-[--radius] border border-border-base">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
      {nextCursor && (
        <div className="mt-5 text-center">
          <a
            href={`/jobs?cursor=${nextCursor}`}
            className="inline-flex h-10 items-center rounded-[--radius] border border-border-strong px-5 text-sm transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
          >
            Load more
          </a>
        </div>
      )}
    </>
  );
}
