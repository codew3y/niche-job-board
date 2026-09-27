import Link from 'next/link';
import type { ReactNode } from 'react';

import { RoleSwitcher } from './role-switcher';
import { signOut } from '@/lib/actions/auth';

export type ShellUser = {
  displayName: string;
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
  /** Unread messages across every thread, both roles. */
  unread: number;
};

/**
 * The same five destinations for both roles, pointing at whatever they mean for that role.
 *
 * Owner request, modelled on Upwork's shape. The previous nav named FEATURES — "Matches",
 * "Applications", "Saved" — which required knowing the product to navigate it. This names
 * INTENTIONS, so the mental model transfers between roles and from other marketplaces:
 * Home is where I start, Search is where I find the other side, Jobs is my own work,
 * Messages is my inbox, Profile is how I appear.
 *
 * "Search" points OUTWARD at the public browse pages, which is deliberate. A client looking
 * for developers and a developer looking for work are doing the same thing from opposite
 * sides, and those pages already do it well.
 *
 * Two items Upwork has are deliberately absent: Contracts and Finances. This product handles
 * no agreements and no money — docs/decisions/ADR-007 and the terms page both say so
 * explicitly — and a navigation item leading to an explanation of why it does not exist is
 * worse than its absence.
 *
 * Matches and Saved lost their nav slots rather than their pages; both are linked from the
 * dashboards, which is where someone looks for them.
 */
const NAV = {
  talent: [
    ['/dashboard/talent', 'Home'],
    ['/jobs', 'Search'],
    ['/dashboard/talent/applications', 'Jobs'],
    ['/dashboard/messages', 'Messages'],
    ['/dashboard/talent/profile', 'Profile'],
  ],
  client: [
    ['/dashboard/client', 'Home'],
    ['/talent', 'Search'],
    ['/dashboard/client/jobs', 'Jobs'],
    ['/dashboard/messages', 'Messages'],
    ['/dashboard/client/profile', 'Profile'],
  ],
} as const;

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = NAV[user.activeRole];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border-base bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          {/*
            Inside the app the logo goes to the DASHBOARD, not the marketing page.
            It used to go to `/`, so a signed-in user clicking it landed on a page inviting
            them to "Get started" — the product apparently forgetting who they were. A logo
            inside an application is a home button for that application.
          */}
          <Link
            href={user.activeRole === 'client' ? '/dashboard/client' : '/dashboard/talent'}
            className="shrink-0 font-semibold tracking-tight"
          >
            TechSelect
          </Link>

          <nav aria-label="Main" className="hidden sm:flex items-center gap-1 flex-1">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-text"
              >
                {label}
                <UnreadBadge show={href === '/dashboard/messages'} count={user.unread} />
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <RoleSwitcher
              activeRole={user.activeRole}
              hasTalent={user.hasTalent}
              hasClient={user.hasClient}
            />
            <form action={signOut}>
              <button className="rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-text">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {/* The same links at small widths. Not a hamburger: four items fit, and a menu that
            hides four links costs a tap for nothing. */}
        <nav aria-label="Main" className="flex sm:hidden gap-1 overflow-x-auto px-4 pb-2">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="flex shrink-0 items-center gap-1.5 rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted hover:bg-surface-sunken"
            >
              {label}
              <UnreadBadge show={href === '/dashboard/messages'} count={user.unread} />
            </Link>
          ))}
        </nav>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer className="border-t border-border-base py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 text-sm text-text-subtle">
          <span>Open to every developer; clients decide.</span>
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

/**
 * The unread count, and nothing when it is zero. A "0" badge is visual noise that trains
 * people to stop reading the badge at all.
 */
function UnreadBadge({ show, count }: { show: boolean; count: number }) {
  if (!show || count < 1) return null;
  return (
    <span className="rounded-full bg-accent px-1.5 py-0.5 text-xs font-medium tabular-nums text-accent-text">
      {count > 99 ? '99+' : count}
      <span className="sr-only"> unread messages</span>
    </span>
  );
}
