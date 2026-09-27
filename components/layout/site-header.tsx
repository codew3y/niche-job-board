import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * The public header — landing, browse, profiles, legal.
 *
 * Signed-out visitors get the two ways in; signed-in ones get a way back to their dashboard,
 * because browsing while signed in is normal and being offered "Get started" again is not.
 *
 * At 320px the logo, two browse links, two auth actions and the theme toggle do not fit on one
 * row (e2e/responsive.spec.ts measures this). Rather than squeeze and clip, phones get two
 * deliberate rows: identity and account on top, browsing and theme below. From `sm` it is one.
 *
 * The row still WRAPS at `sm` and above, rather than being forced onto one line. Breakpoints are
 * measured against the browser's 16px default, not the page's root size, so at 200% text zoom a
 * 640px window is still "sm" while its text is twice the size — a no-wrap row then ran 417px off
 * the screen (e2e/accessibility.spec.ts, "at 200% zoom").
 */
export function SiteHeader({ dashboard }: { dashboard: string | null }) {
  const link =
    'rounded-full px-3 py-2 text-sm text-text-muted transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-text';

  return (
    <header className="z-sticky border-b border-border-base bg-surface pt-[env(safe-area-inset-top,0px)]">
      <div className="gutter mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 py-2.5 sm:min-h-(--nav-height) sm:py-2">
        <Link
          href="/"
          className="order-1 shrink-0 font-serif text-[1.5rem] leading-none sm:text-[1.625rem]"
        >
          TechSelect
        </Link>

        <nav
          aria-label="Browse"
          className="order-3 -ml-3 flex w-full items-center gap-1 sm:order-2 sm:ml-2 sm:w-auto"
        >
          <Link href="/jobs" className={link}>
            Jobs
          </Link>
          <Link href="/talent" className={link}>
            Developers
          </Link>
          {/* The toggle lives in this row on phones, where the top row is full. */}
          <ThemeToggle className="ml-auto sm:hidden" />
        </nav>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:order-3">
          <ThemeToggle className="hidden sm:grid" />
          {dashboard ? (
            <Link href={dashboard} className={buttonStyles({ size: 'sm' })}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={`${link} px-2.5 sm:px-3`}>
                Sign in
              </Link>
              <Link href="/signup" className={`${buttonStyles({ size: 'sm' })} px-3`}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
