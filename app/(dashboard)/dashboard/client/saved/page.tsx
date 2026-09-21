import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Saved' };

export default function SavedTalentPage() {
  return (
    <div>
      <PageHeader title="Saved" subtitle="Developers you've bookmarked." />
      {/* Saving requires browsable profiles, which arrive in Phase 3. The empty state is
          written now rather than bolted on later — see docs/components.md. */}
      <EmptyState
        title="Nothing saved yet"
        body="Once you can browse developers, anyone you bookmark shows up here. Your saved list is private — they are never told."
      />
    </div>
  );
}
