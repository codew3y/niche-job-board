import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
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
    <main id="main" className="gutter mx-auto w-full max-w-5xl flex-1 py-10 sm:py-14">
      <PageHeader
        eyebrow="Browse"
        title="Developers"
        subtitle="Everyone who wants to be listed is listed. Judge them on what you see."
      />

      <TalentFilters skills={skills} />

      <Suspense
        key={JSON.stringify(raw)}
        fallback={
          <div className="mt-8">
            <JobListSkeleton label="Loading developers" />
          </div>
        }
      >
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
      <div className="mt-8">
        <EmptyState
          icon={SearchX}
          title="Nobody matches that"
          body="Published profiles appear here. Nobody has published one that matches those filters."
          action={
            <Link href="/talent" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
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
        {talent.length} {talent.length === 1 ? 'developer' : 'developers'}
      </p>
      <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
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
        <div className="mt-6 text-center">
          <Link
            href={`/talent?cursor=${nextCursor}`}
            className={buttonStyles({ variant: 'secondary' })}
          >
            Load more
          </Link>
        </div>
      )}
    </>
  );
}
