import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSessionProfile } from '@/lib/supabase/session';

/**
 * Public shell — browse, profiles, jobs, legal. Signed-out visitors get the ways in; signed-in
 * ones get a way back to their dashboard, because browsing while signed in is normal and being
 * offered "Get started" again is not.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  // Cached per request: the page below often needs the same profile.
  const profile = await getSessionProfile();
  const dashboard =
    profile && (profile.hasTalent || profile.hasClient)
      ? profile.activeRole === 'client'
        ? '/dashboard/client'
        : '/dashboard/talent'
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader dashboard={dashboard} />
      {children}
      <SiteFooter />
    </div>
  );
}
