import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EmptyState } from '@/components/ui/empty-state';
import { JobListSkeleton } from '@/components/shared/skeleton';
import { TalentCard } from '@/components/talent/talent-card';
import { talentSearchParams } from '@/lib/schemas/search';
import { canSave, savedTalentIds } from '@/lib/services/saved-ids';
import { listTalent } from '@/lib/services/talent';

export const metadata: Metadata = {
  title: 'Browse developers',
  description:
    'Freelance software, web and automation developers — with the work they have actually shipped.',
};

export default async function TalentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = talentSearchParams.safeParse(raw);
  const params = parsed.success ? parsed.data : talentSearchParams.parse({});

  return (
    <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Developers</h1>
        <p className="mt-1 text-text-muted">
          Every profile here carries evidence — shipped projects, or a portfolio site.
        </p>
      </header>

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
      <div className="mt-2 overflow-hidden rounded-[--radius] border border-border-base">
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
            className="inline-flex h-10 items-center rounded-[--radius] border border-border-strong px-5 text-sm transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
          >
            Load more
          </a>
        </div>
      )}
    </>
  );
}
