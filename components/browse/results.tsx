import { ArrowRight, MagnifyingGlassMinus as SearchX } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { JobCard } from '@/components/job/job-card';
import { TalentCard } from '@/components/talent/talent-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonStyles } from '@/components/ui/button';
import type { JobSearchParams, TalentSearchParams } from '@/lib/schemas/search';
import { listJobs } from '@/lib/services/jobs';
import { canSave, savedJobIds, savedTalentIds } from '@/lib/services/saved-ids';
import { listTalent } from '@/lib/services/talent';

/**
 * The two result lists behind /browse. `canSave` decides the bookmark from the viewer's ACTIVE
 * role (lib/roles.ts), so both lists agree with the dashboard about who is looking.
 *
 * `query` is the current query string, so "Load more" keeps the filters. The old per-type pages
 * linked to `/jobs?cursor=…`, which dropped every filter on the second page.
 *
 * The list sits in one ruled panel (rows divided by hairlines), not a card per result: every row
 * is the same kind of thing, so a shadow or border per row would add weight without hierarchy.
 */

const LIST = 'overflow-hidden rounded-lg border border-border-base bg-surface-raised';
const COUNT = 'mb-3 text-sm text-text-muted tabular-nums';
const SEE_ALL =
  'mt-3 inline-flex h-10 items-center gap-1 text-sm font-semibold text-link hover:underline';

const moreHref = (query: URLSearchParams, cursor: string) => {
  const next = new URLSearchParams(query);
  next.set('cursor', cursor);
  return `/browse?${next.toString()}`;
};

const seeAllHref = (query: URLSearchParams, type: 'jobs' | 'developers') => {
  const next = new URLSearchParams(query);
  next.set('type', type);
  return `/browse?${next.toString()}`;
};

export async function JobResults({
  params,
  query,
  preview = false,
}: {
  params: JobSearchParams;
  query: URLSearchParams;
  /** The "All" view: a short list and a link to the full one, rather than pagination. */
  preview?: boolean;
}) {
  const { jobs, nextCursor } = await listJobs(
    preview ? { ...params, limit: 5, cursor: undefined } : params,
  );
  const [saveable, saved] = await Promise.all([canSave('job'), savedJobIds(jobs.map((j) => j.id))]);

  if (jobs.length === 0) {
    return preview ? (
      <p className="rounded-lg border border-dashed border-border-strong px-5 py-4 text-sm text-text-muted">
        No jobs match these filters.
      </p>
    ) : (
      <Empty kind="jobs" />
    );
  }

  return (
    <>
      {!preview && (
        <p className={COUNT} aria-live="polite">
          {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'}
          {nextCursor ? ' on this page' : ''}
        </p>
      )}
      <div className={LIST}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} saveable={saveable} saved={saved.has(job.id)} />
        ))}
      </div>
      {preview && nextCursor && (
        <Link href={seeAllHref(query, 'jobs')} className={SEE_ALL}>
          See all jobs <ArrowRight aria-hidden="true" size={14} />
        </Link>
      )}
      {!preview && nextCursor && (
        <div className="mt-6 text-center">
          <Link
            href={moreHref(query, nextCursor)}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Load more
          </Link>
        </div>
      )}
    </>
  );
}

export async function TalentResults({
  params,
  query,
  preview = false,
}: {
  params: TalentSearchParams;
  query: URLSearchParams;
  preview?: boolean;
}) {
  const { talent, nextCursor } = await listTalent(
    preview ? { ...params, limit: 5, cursor: undefined } : params,
  );
  const [saveable, saved] = await Promise.all([
    canSave('talent'),
    savedTalentIds(talent.map((p) => p.id)),
  ]);

  if (talent.length === 0) {
    return preview ? (
      <p className="rounded-lg border border-dashed border-border-strong px-5 py-4 text-sm text-text-muted">
        No developers match these filters.
      </p>
    ) : (
      <Empty kind="developers" />
    );
  }

  return (
    <>
      {!preview && (
        <p className={COUNT} aria-live="polite">
          {talent.length} {talent.length === 1 ? 'developer' : 'developers'}
        </p>
      )}
      <div className={LIST}>
        {talent.map((person) => (
          <TalentCard
            key={person.id}
            person={person}
            saveable={saveable}
            saved={saved.has(person.id)}
          />
        ))}
      </div>
      {preview && nextCursor && (
        <Link href={seeAllHref(query, 'developers')} className={SEE_ALL}>
          See all developers <ArrowRight aria-hidden="true" size={14} />
        </Link>
      )}
      {!preview && nextCursor && (
        <div className="mt-6 text-center">
          <Link
            href={moreHref(query, nextCursor)}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Load more
          </Link>
        </div>
      )}
    </>
  );
}

function Empty({ kind }: { kind: 'jobs' | 'developers' }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Nothing matches those filters"
      body="Try a broader skill, drop a filter, or clear the search box."
      action={
        <Link href={`/browse?type=${kind}`} className={buttonStyles({ variant: 'secondary' })}>
          Clear filters
        </Link>
      }
    />
  );
}
