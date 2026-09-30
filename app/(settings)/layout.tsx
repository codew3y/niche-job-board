import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/layout/app-shell';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { signOut } from '@/lib/actions/auth';
import { logoHref } from '@/lib/roles';
import { loadShellUser } from '@/lib/services/shell';
import { getSessionUser, getViewer } from '@/lib/supabase/session';

/**
 * Settings has its own group because the dashboard's guard is wrong for it.
 *
 * `app/(dashboard)/layout.tsx` redirects anyone without a role profile to /select-role. That
 * is right for a dashboard (there is nothing to show) and wrong for settings, which is
 * where /privacy sends people to DELETE their account. Someone who signed up and abandoned
 * onboarding has a real auth row and a real email address we hold, and under that guard they
 * could not reach the page that removes it. Being unable to leave until you finish signing up
 * is not an erasure right.
 *
 * The route policy already allowed /dashboard/settings pre-role; the layout above it quietly
 * did not, so allowing it there alone changed nothing. This is the half that was missing.
 *
 * Route groups do not affect URLs, so the paths are unchanged.
 */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/');

  const viewer = await getViewer();

  // The ordinary case: a finished account gets the ordinary chrome, so settings does not
  // look like a different product.
  if (viewer && (viewer.hasTalent || viewer.hasClient)) {
    return <AppShell user={await loadShellUser(viewer)}>{children}</AppShell>;
  }

  // Mid-onboarding. No role means no dashboard to link to, so a sidebar would be links that
  // all bounce. A way back and a way out is the honest version.
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border-base bg-surface-raised pt-[env(safe-area-inset-top,0px)]">
        <div className="gutter mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 py-2">
          <Logo href={logoHref(true)} />
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/select-role"
              className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'h-10' })}
            >
              Finish setting up
            </Link>
            <form action={signOut}>
              <SubmitButton variant="ghost" size="sm" className="h-10" pendingLabel="Logging out…">
                Log out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="gutter mx-auto w-full max-w-5xl flex-1 py-8 sm:py-12">
        {children}
      </main>
    </div>
  );
}
