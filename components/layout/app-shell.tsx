import Link from 'next/link';
import type { ReactNode } from 'react';

import { RoleSwitcher } from './role-switcher';
import { signOut } from '@/lib/actions/auth';

export type ShellUser = {
  displayName: string;
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
};

const NAV = {
  talent: [
    ['/dashboard/talent', 'Dashboard'],
    ['/dashboard/talent/matches', 'Matches'],
    ['/dashboard/talent/applications', 'Applications'],
    ['/dashboard/talent/profile', 'Profile'],
  ],
  client: [
    ['/dashboard/client', 'Dashboard'],
    ['/dashboard/client/jobs', 'Jobs'],
    ['/dashboard/client/saved', 'Saved'],
  ],
} as const;

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const nav = NAV[user.activeRole];

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-border-base bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="font-mono text-sm shrink-0">
            nichejobboard
          </Link>

          <nav aria-label="Main" className="hidden sm:flex items-center gap-1 flex-1">
            {nav.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted transition-colors duration-[--duration-fast] hover:bg-surface-sunken hover:text-text"
              >
                {label}
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
              className="shrink-0 rounded-[--radius-sm] px-3 py-1.5 text-sm text-text-muted hover:bg-surface-sunken"
            >
              {label}
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
