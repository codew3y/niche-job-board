import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { cn } from '@/lib/ui/cn';

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
 * `overlay` is the landing variant: transparent, over the hero video, with light text.
 */
export function SiteHeader({
  dashboard,
  overlay = false,
}: {
  /** Where "Dashboard" goes for a signed-in user; null when signed out. */
  dashboard: string | null;
  overlay?: boolean;
}) {
  const link = cn(
    'rounded-full px-3 py-2 text-sm transition-colors duration-fast ease-out',
    overlay
      ? 'text-media-surface/80 hover:bg-media-surface/10 hover:text-media-surface'
      : 'text-text-muted hover:bg-surface-sunken hover:text-text',
  );

  return (
    <header
      className={cn(
        'z-sticky pt-[env(safe-area-inset-top,0px)]',
        overlay
          ? 'absolute inset-x-0 top-0 text-media-surface'
          : 'border-b border-border-base bg-surface',
      )}
    >
      <div className="gutter mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 py-2.5 sm:h-(--nav-height) sm:flex-nowrap sm:py-0">
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
          <ThemeToggle
            className={cn(
              'ml-auto sm:hidden',
              overlay && 'text-media-surface/80 hover:bg-media-surface/10 hover:text-media-surface',
            )}
          />
        </nav>

        <div className="order-2 ml-auto flex shrink-0 items-center gap-1 sm:order-3">
          <ThemeToggle
            className={cn(
              'hidden sm:grid',
              overlay && 'text-media-surface/80 hover:bg-media-surface/10 hover:text-media-surface',
            )}
          />
          {dashboard ? (
            <Link
              href={dashboard}
              className={cn(
                buttonStyles({ variant: overlay ? 'secondary' : 'primary', size: 'sm' }),
                overlay &&
                  'border-media-surface/30 bg-media-surface/10 text-media-surface hover:border-media-surface/50 hover:bg-media-surface/20',
              )}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(link, 'px-2.5 sm:px-3')}>
                Sign in
              </Link>
              <Link
                href="/signup"
                className={cn(
                  buttonStyles({ variant: 'primary', size: 'sm' }),
                  'px-3',
                  overlay && 'bg-media-surface text-media-text hover:opacity-90',
                )}
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
