import Link from 'next/link';
import type { ReactNode } from 'react';

import { getSessionProfile } from '@/lib/supabase/session';

/**
 * Public shell. Signed-out visitors get sign-in links; signed-in ones get a way back to
 * their dashboard, because browsing while signed in is normal and being offered "Sign up"
 * again is not.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  // Cached per request: the page below often needs the same profile, and previously fetched
  // it again.
  const profile = await getSessionProfile();
  const dashboard =
    profile && (profile.hasTalent || profile.hasClient)
      ? profile.activeRole === 'client'
        ? '/dashboard/client'
        : '/dashboard/talent'
      : null;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border-base">
        {/*
          Wraps rather than fixing a 56px row. At 320px the logo, two nav links and two auth
          links do not fit on one line — measured by e2e/responsive.spec.ts, which caught this
          pushing ~40px past the viewport on /jobs and /talent. A second line is the honest
          answer; squeezing is how text ends up clipped.
        */}
        <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <Link href="/" className="font-semibold tracking-tight shrink-0">
            TechSelect
          </Link>
          <nav aria-label="Browse" className="flex items-center gap-1">
            <Link
              href="/jobs"
              className="rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-text"
            >
              Jobs
            </Link>
            <Link
              href="/talent"
              className="rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-text"
            >
              Developers
            </Link>
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2 text-sm">
            {dashboard ? (
              <Link
                href={dashboard}
                className="rounded-[--radius-sm] border border-border-strong px-3 py-1.5 transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-[--radius-sm] px-3 py-1.5 text-text-muted hover:text-text"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-[--radius-sm] bg-accent px-3 py-1.5 font-medium text-accent-text transition-colors duration-[--duration-fast] hover:bg-accent-hover"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {children}

      <footer className="mt-16 border-t border-border-base py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-2 px-4 text-sm text-text-subtle">
          <span>TechSelect — open to every developer; clients decide.</span>
          {/* Linked from every public page, not only from Google's consent screen. A policy
              reachable only by those who already went looking is not really published. */}
          <nav aria-label="Legal" className="flex gap-5">
            <Link href="/privacy" className="hover:text-text">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-text">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
