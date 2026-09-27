import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { JobListSkeleton } from '@/components/shared/skeleton';
import { TalentCard } from '@/components/talent/talent-card';
import { TalentFilters } from '@/components/talent/talent-filters';
import { talentSearchParams } from '@/lib/schemas/search';
import { canSave, savedTalentIds } from '@/lib/services/saved-ids';
import { groupByCategory, listSkills } from '@/lib/services/skills';
import { listTalent } from '@/lib/services/talent';

export const metadata: Metadata = {
  title: 'Browse developers',
  description:
    'Freelance software, web and automation developers. Browse everyone, filter by skill, and decide for yourself.',
};

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = talentSearchParams.safeParse(raw);
  const params = parsed.success ? parsed.data : talentSearchParams.parse({});
  const skills = groupByCategory(await listSkills());

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
        <p className="mt-1 text-text-muted">
          Everyone who wants to be listed is listed. Judge them on what you see.
        </p>
      </header>

      <TalentFilters skills={skills} />

      <Suspense key={JSON.stringify(raw)} fallback={<JobListSkeleton />}>
        <TalentResults params={params} />
      </Suspense>
    </main>
  );
}

async function TalentResults({ params }: { params: ReturnType<typeof talentSearchParams.parse> }) {
  const { talent, nextCursor } = await listTalent(params);
  const [saveable, saved] = await Promise.all([
    canSave('talent'),
    savedTalentIds(talent.map((p) => p.id)),
  ]);

  if (talent.length === 0) {
    return (
      <EmptyState
        title="No developers yet"
        body="Published profiles appear here. Nobody has published one that matches."
      />
    );
  }

  return (
    <>
      <p className="text-sm text-text-subtle" aria-live="polite">
        {talent.length} {talent.length === 1 ? 'developer' : 'developers'}
      </p>
      <div className="mt-2 overflow-hidden rounded-md border border-border-base">
        {talent.map((person) => (
          <TalentCard
            key={person.id}
            person={person}
            saveable={saveable}
            saved={saved.has(person.id)}
          />
        ))}
      </div>
      {nextCursor && (
        <div className="mt-5 text-center">
          <a
            href={`/talent?cursor=${nextCursor}`}
            className="inline-flex h-10 items-center rounded-md border border-border-strong px-5 text-sm transition-colors duration-fast hover:bg-surface-sunken"
          >
            Load more
          </a>
        </div>
      )}
    </>
  );
}
