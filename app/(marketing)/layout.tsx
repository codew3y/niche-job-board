import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { loadShellUser } from '@/lib/services/shell';
import { getViewer } from '@/lib/supabase/session';

/**
 * The shell for the pages that stay public: job and developer detail pages, and the legal pages.
 *
 * Signed in with a role → the normal app sidebar, so opening a job from Browse does not drop
 * you out of the app. Signed out (someone following a shared link) → the public site's header
 * and footer.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (viewer && (viewer.hasTalent || viewer.hasClient)) {
    return <AppShell user={await loadShellUser(viewer)}>{children}</AppShell>;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
