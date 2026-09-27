import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell, type ShellUser } from '@/components/layout/app-shell';
import { buttonStyles } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { signOut } from '@/lib/actions/auth';
import { unreadCount } from '@/lib/services/messaging';
import { createClient } from '@/lib/supabase/server';

/**
 * Settings has its own group because the dashboard's guard is wrong for it.
 *
 * `app/(dashboard)/layout.tsx` redirects anyone without a role profile to /select-role. That
 * is right for a dashboard — there is nothing to show — and wrong for settings, which is
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();

  // The ordinary case: a finished account gets the ordinary chrome, so settings does not
  // look like a different product.
  if (profile && (profile.has_talent || profile.has_client)) {
    const shellUser: ShellUser = {
      displayName: profile.display_name,
      activeRole: profile.active_role,
      hasTalent: profile.has_talent,
      hasClient: profile.has_client,
      unread: await unreadCount(user.id),
    };
    return <AppShell user={shellUser}>{children}</AppShell>;
  }

  // Mid-onboarding. No role means no dashboard to link to, so the nav would be five links
  // that all bounce. A header with a way back and a way out is the honest version.
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border-base pt-[env(safe-area-inset-top,0px)]">
        <div className="gutter mx-auto flex min-h-(--nav-height) max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 py-2">
          <Link href="/" className="shrink-0 font-serif text-[1.625rem] leading-none">
            TechSelect
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link href="/select-role" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
              Finish setting up
            </Link>
            <form action={signOut}>
              <SubmitButton variant="ghost" size="sm" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </div>
      </header>
      <main id="main" className="gutter mx-auto w-full max-w-6xl flex-1 py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
