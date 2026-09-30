import { Briefcase, House, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { NavLinks, type NavItem } from './nav-links';
import { signOut, switchRole } from '@/lib/actions/auth';
import { logoHref } from '@/lib/roles';
import type { ShellUser } from '@/lib/services/shell';

export type { ShellUser } from '@/lib/services/shell';

/**
 * Four destinations per role, pointing at whatever they mean for that role.
 *
 * Browse is ONE page for both sides (jobs and developers behind a filter), so it is the same
 * link for everyone. Profile is deliberately NOT a nav item: it lives only in the profile menu
 * at the foot of the sidebar, so there is exactly one way to it.
 *
 * Contracts and Finances are absent on purpose: this product handles no agreements and no
 * money (ADR-007, the terms page), and a nav item explaining why a thing does not exist is
 * worse than its absence. Matches and Saved are linked from the dashboards.
 */
const NAV: Record<ShellUser['activeRole'], NavItem[]> = {
  talent: [
    { href: '/dashboard/talent', label: 'Home', icon: <House /> },
    { href: '/browse', label: 'Browse', icon: <Search /> },
    { href: '/dashboard/talent/applications', label: 'Applications', icon: <Briefcase /> },
    { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
  ],
  client: [
    { href: '/dashboard/client', label: 'Home', icon: <House /> },
    { href: '/browse', label: 'Browse', icon: <Search /> },
    { href: '/dashboard/client/jobs', label: 'My jobs', icon: <Briefcase /> },
    { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
  ],
};

/**
 * The app frame: a fixed left sidebar, no top header.
 *
 *   ≥ lg   a 15rem sidebar — logo, labelled nav, profile picture at the foot.
 *   < lg   the same sidebar as a 4rem icon rail. Labels stay in the DOM as accessible names
 *          (and a hover title), so nothing is lost to a screen reader at any width.
 *
 * One <nav>, rendered once, at every width — two copies would give a screen-reader user two
 * identical "Main" landmarks to choose between.
 */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <aside
        aria-label="App"
        className="fixed inset-y-0 left-0 z-nav flex w-16 flex-col border-r border-border-base bg-surface-raised pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[env(safe-area-inset-left,0px)] lg:w-60"
      >
        <div className="flex h-10 items-center justify-center lg:justify-start lg:px-5">
          <Logo href={logoHref(true)} compact className="lg:hidden" />
          <Logo href={logoHref(true)} className="hidden lg:inline-flex" />
        </div>

        <NavLinks items={NAV[user.activeRole]} unread={user.unread} />

        <div className="mt-auto flex justify-center px-2 lg:justify-start lg:px-3">
          <AccountMenu
            displayName={user.displayName}
            avatarUrl={user.avatarUrl}
            activeRole={user.activeRole}
            hasTalent={user.hasTalent}
            hasClient={user.hasClient}
            profileHref={user.profileHref}
            editProfileHref={user.editProfileHref}
            switchRole={switchRole}
            signOut={signOut}
          />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col pl-16 lg:pl-60">
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
          {children}
        </main>
        <footer className="mx-auto flex w-full max-w-5xl flex-wrap gap-x-5 gap-y-1 px-4 py-6 text-sm text-text-subtle sm:px-8">
          <Link href="/privacy" className="hover:text-text">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-text">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
