import Link from 'next/link';

import { MobileMenu } from './mobile-menu';
import { CONTAINER } from './page-parts';
import { SiteNavLinks } from './site-nav-links';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/ui/cn';
import { getSessionUser } from '@/lib/supabase/session';

/**
 * The public site's header, on every page outside the app: logo top-left (to the home page),
 * the page links, a light/dark toggle, and Log in / Sign up on the right. Below `lg` the links
 * and buttons collapse into a menu: five links, the logo and two buttons do not fit one row on a
 * tablet.
 *
 * SHAPE. A floating bar detached from the top edge (soft-skill: no edge-to-edge bar glued to the
 * top), still sticky so it stays in view while the page scrolls (the owner's requirement). A
 * hairline, a faint diffuse shadow and a translucent surface with a blur: the one place on the
 * site that blurs, because it is the one fixed layer content passes under. Solid where
 * backdrop-filter is unsupported. 60px tall, one line from `lg` (nav cap 80px).
 *
 * Someone already signed in gets one "Go to dashboard" button instead of the two auth buttons:
 * offering a signed-in person "Sign up" reads as the product forgetting them. On /login and
 * /signup (`current`) the button for the page you are on is dropped: a "Sign up" button above
 * the sign-up form is a second call to action for the same thing (taste-skill).
 */
export async function SiteHeader({ current }: { current?: 'login' | 'signup' } = {}) {
  const signedIn = Boolean(await getSessionUser());
  const dashboardHref = signedIn ? '/dashboard' : null;

  return (
    <header className="sticky top-0 z-sticky pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
      <div className={CONTAINER}>
        {/* `relative` so the mobile menu panel (absolute, top-full) hangs from the bar. */}
        <div
          className={cn(
            'relative flex h-15 items-center gap-6 rounded-lg border border-border-base bg-surface-raised/80 pr-2 pl-4 shadow-sm backdrop-blur-md',
            'supports-[not(backdrop-filter:blur(0))]:bg-surface-raised',
          )}
        >
          <Logo href="/" />

          <nav aria-label="Site" className="hidden flex-1 justify-center lg:flex">
            <SiteNavLinks />
          </nav>

          <div className="ml-auto hidden items-center gap-1 lg:flex">
            <ThemeToggle />
            {dashboardHref ? (
              <Link href={dashboardHref} className={buttonStyles({ size: 'sm' })}>
                Go to dashboard
              </Link>
            ) : (
              <>
                {current !== 'login' && (
                  <Link href="/login" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                    Log in
                  </Link>
                )}
                {current !== 'signup' && (
                  <Link href="/signup" className={buttonStyles({ size: 'sm' })}>
                    Sign up
                  </Link>
                )}
              </>
            )}
          </div>

          {/* On phones the toggle sits beside the menu button rather than inside the menu: a
              theme switch is used on its own, and burying it a tap deep would hide it. */}
          <div className="ml-auto flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <MobileMenu dashboardHref={dashboardHref} current={current} />
          </div>
        </div>
      </div>
    </header>
  );
}
