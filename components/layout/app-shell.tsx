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

const NAV = {
  talent: [
    ['/dashboard/talent', 'Dashboard'],
    ['/dashboard/talent/matches', 'Matches'],
    ['/dashboard/talent/applications', 'Applications'],
    ['/dashboard/talent/profile', 'Profile'],
    ['/dashboard/messages', 'Messages'],
  ],
  client: [
    ['/dashboard/client', 'Dashboard'],
    ['/dashboard/client/jobs', 'Jobs'],
    ['/dashboard/client/saved', 'Saved'],
    ['/dashboard/messages', 'Messages'],
  ],
} as const;

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = NAV[user.activeRole];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border-base bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="shrink-0 font-semibold tracking-tight">
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
        <div className="mx-auto max-w-6xl px-4 text-sm text-text-subtle">
          Portfolio-first hiring for developers.
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
