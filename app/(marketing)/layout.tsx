import Link from 'next/link';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { logoHref } from '@/lib/roles';
import { loadShellUser } from '@/lib/services/shell';
import { getSessionUser, getViewer } from '@/lib/supabase/session';

/**
 * The shell for the pages that stay public: job and developer detail pages, and the legal pages.
 *
 * Signed in with a role → the normal app sidebar, so opening a job from Browse does not drop
 * you out of the app. Signed out (someone following a shared link) → just the logo and a way to
 * log in. There is deliberately no Jobs / Developers navigation here: browsing is inside the
 * app.
 */
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (viewer && (viewer.hasTalent || viewer.hasClient)) {
    return <AppShell user={await loadShellUser(viewer)}>{children}</AppShell>;
  }

  const signedIn = Boolean(await getSessionUser());
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-8">
        <Logo href={logoHref(signedIn)} />
        {!signedIn && (
          <Link href="/" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            Log in
          </Link>
        )}
      </div>
      <main id="main" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 sm:px-8">
        {children}
      </main>
      <footer className="mx-auto flex w-full max-w-5xl gap-5 px-4 py-6 text-sm text-text-subtle sm:px-8">
        <Link href="/privacy" className="hover:text-text">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-text">
          Terms
        </Link>
      </footer>
    </div>
  );
}
