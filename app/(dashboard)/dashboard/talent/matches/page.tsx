import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';

export const metadata: Metadata = { title: 'Matches' };

export default function MatchesPage() {
  return (
    <div>
      <PageHeader title="Matches" subtitle="Briefs that fit what you've shipped." />
      {/* Story S4: say "no strong matches yet" rather than padding the list. That rule
          applies before the matching layer exists, not just after it. */}
      <EmptyState
        title="No strong matches yet"
        body="When a brief genuinely fits your work you'll see it here, with a short reason why. We'd rather show nothing than pad the list."
      />
    </div>
  );
}
