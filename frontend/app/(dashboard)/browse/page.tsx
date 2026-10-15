import type { Metadata } from 'next';
import { Suspense } from 'react';

import { BrowseFilters } from '@/components/browse/browse-filters';
import { JobResults, TalentResults } from '@/components/browse/results';
import { BrowseResultsSkeleton } from '@/components/shared/skeleton';
import { PageHeader } from '@/components/ui/page-header';
import {
  browseType,
  jobSearchParams,
  talentSearchParams,
} from '@techselect/backend/schemas/search';
import { groupByCategory, listSkills } from '@techselect/backend/services/skills';

export const metadata: Metadata = { title: 'Browse' };

type Raw = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Browse: jobs and developers on one page, with the type as a filter (All / Jobs / Developers).
 *
 * The two old pages (/jobs, /talent) had the same layout and the same data behaviour: a search
 * box, a skill filter, a few type-specific selects, cursor pagination, all state in the URL. They
 * redirect here now (next.config.ts), so old links and bookmarks still land.
 *
 * Signed-in only, like the rest of the app. The detail pages it links to stay public.
 */
export default async function BrowsePage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const type = browseType.parse(first(raw.type));

  // Parse rather than trust: query strings are user input like any other (§5.4).
  const jobs = jobSearchParams.safeParse(raw);
  const talent = talentSearchParams.safeParse(raw);
  const jobParams = jobs.success ? jobs.data : jobSearchParams.parse({});
  const talentParams = talent.success ? talent.data : talentSearchParams.parse({});

  // The filters as they stand, minus the page position: what "Load more" and "See all" carry.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'cursor' || value === undefined) continue;
    query.set(key, Array.isArray(value) ? value.join(',') : value);
  }

  const skills = groupByCategory(await listSkills());

  return (
    <div>
      <PageHeader
        title="Browse"
        subtitle="Everyone who wants to be listed is listed. Judge them on what you see."
      />

      <BrowseFilters type={type} skills={skills} />

      <div className="mt-8">
        <Suspense key={JSON.stringify(raw)} fallback={<BrowseResultsSkeleton type={type} />}>
          {type === 'jobs' && <JobResults params={jobParams} query={query} />}
          {type === 'developers' && <TalentResults params={talentParams} query={query} />}
          {type === 'all' && (
            <div className="space-y-10">
              <section aria-labelledby="browse-jobs">
                <h2 id="browse-jobs" className="mb-3 text-lg font-semibold tracking-tight">
                  Jobs
                </h2>
                <JobResults params={jobParams} query={query} preview />
              </section>
              <section aria-labelledby="browse-developers">
                <h2 id="browse-developers" className="mb-3 text-lg font-semibold tracking-tight">
                  Developers
                </h2>
                <TalentResults params={talentParams} query={query} preview />
              </section>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
