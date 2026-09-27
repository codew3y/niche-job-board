import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { JobCard } from '@/components/job/job-card';
import { JobFilters } from '@/components/job/job-filters';
import { JobListSkeleton } from '@/components/shared/skeleton';
import { jobSearchParams } from '@/lib/schemas/search';
import { listJobs } from '@/lib/services/jobs';
import { canSave, savedJobIds } from '@/lib/services/saved-ids';
import { groupByCategory, listSkills } from '@/lib/services/skills';

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
  // Fetched at the route boundary and passed down — no component below here fetches its own
  // data (docs/components.md).
  const skills = groupByCategory(await listSkills());

  return (
    <main id="main" className="gutter mx-auto w-full max-w-5xl flex-1 py-10 sm:py-14">
      <PageHeader
        eyebrow="Browse"
        title="Jobs"
        subtitle="Software, web and automation work. No AI needed to find it — search and filters do the job."
      />

      <JobFilters skills={skills} />

      <Suspense
        key={JSON.stringify(raw)}
        fallback={
          <div className="mt-8">
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
  // One query for the page rather than a lookup per card.
  const [saveable, saved] = await Promise.all([canSave('job'), savedJobIds(jobs.map((j) => j.id))]);

  if (jobs.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={SearchX}
          title="Nothing matches those filters"
          body="Try widening them — or clearing the search box. We'd rather show nothing than pad the list with jobs that don't fit."
          action={
            <Link href="/jobs" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Clear everything
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <p className="mt-8 mb-3 text-sm text-text-subtle" aria-live="polite">
        {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
        {nextCursor ? ' on this page' : ''}
      </p>
      <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} saveable={saveable} saved={saved.has(job.id)} />
        ))}
      </div>
      {nextCursor && (
        <div className="mt-6 text-center">
          <Link
            href={`/jobs?cursor=${nextCursor}`}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Load more
          </Link>
        </div>
      )}
    </>
  );
}
