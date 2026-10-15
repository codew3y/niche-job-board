import { ArrowRight } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { HeaderShell } from './header-shell';
import { MobileMenu } from './mobile-menu';
import { CONTAINER } from './page-parts';
import { SiteNavLinks } from './site-nav-links';
import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/ui/cn';
import { getSessionUser } from '@techselect/backend/supabase/session';

/**
 * The public site's header, on every page outside the app.
 *
 * LAYOUT. A full-width bar (HeaderShell): transparent at the top of the page, a translucent
 * surface with a hairline once you scroll. Inside the page container, three zones on one 64px
 * line from `lg`: the logo on the left, the page links in the middle as one segmented pill (the
 * current page is the raised segment), and the theme toggle with Log in / Sign up on the right.
 * Below `lg` the links and buttons collapse into a menu that hangs from the bar.
 *
 * Someone already signed in gets one "Go to dashboard" button instead of the two auth buttons:
 * offering a signed-in person "Sign up" reads as the product forgetting them. On /login and
 * /signup (`current`) the button for the page you are on is dropped: a "Sign up" button above
 * the sign-up form is a second call to action for the same thing.
 */
export async function SiteHeader({ current }: { current?: 'login' | 'signup' } = {}) {
  const signedIn = Boolean(await getSessionUser());
  const dashboardHref = signedIn ? '/dashboard' : null;

  return (
    <HeaderShell>
      {/* `relative` so the mobile menu panel (absolute, top-full) hangs from the bar. */}
      <div className={cn(CONTAINER, 'relative flex h-16 items-center gap-6')}>
        <Logo href="/" />

        <nav aria-label="Site" className="absolute left-1/2 hidden -translate-x-1/2 lg:block">
          <SiteNavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <span aria-hidden="true" className="mx-1 h-5 w-px bg-border-base" />
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className={buttonStyles({ size: 'sm', className: 'rounded-full px-4' })}
            >
              Go to dashboard
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <>
              {current !== 'login' && (
                <Link
                  href="/login"
                  className={buttonStyles({
                    variant: 'ghost',
                    size: 'sm',
                    className: 'rounded-full',
                  })}
                >
                  Log in
                </Link>
              )}
              {current !== 'signup' && (
                <Link
                  href="/signup"
                  className={buttonStyles({ size: 'sm', className: 'rounded-full px-4' })}
                >
                  Sign up
                  <ArrowRight aria-hidden="true" />
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
    </HeaderShell>
  );
}
