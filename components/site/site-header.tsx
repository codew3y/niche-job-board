import Link from 'next/link';

import { MobileMenu } from './mobile-menu';
import { SiteNavLinks } from './site-nav-links';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@/lib/supabase/session';

/**
 * The public site's header, on every page outside the app: logo top-left (to the home page),
 * the page links, and Log in / Sign up on the right. On phones the links and buttons collapse
 * into a menu.
 *
 * Someone already signed in gets one "Go to dashboard" button instead of the two auth buttons —
 * offering a signed-in person "Sign up" reads as the product forgetting them.
 */
export async function SiteHeader() {
  const signedIn = Boolean(await getSessionUser());
  const dashboardHref = signedIn ? '/dashboard' : null;

  return (
    <header className="relative z-sticky border-b border-border-base bg-surface pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo href="/" />

        <nav aria-label="Site" className="hidden flex-1 justify-center md:flex">
          <SiteNavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {dashboardHref ? (
            <Link href={dashboardHref} className={buttonStyles({ size: 'sm' })}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                Log in
              </Link>
              <Link href="/signup" className={buttonStyles({ size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </div>

        <div className="ml-auto md:hidden">
          <MobileMenu dashboardHref={dashboardHref} />
        </div>
      </div>
    </header>
  );
}
