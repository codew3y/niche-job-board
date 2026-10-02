import {
  Briefcase,
  House,
  ChatCenteredText as MessageSquare,
  MagnifyingGlass as Search,
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu } from './account-menu';
import { Logo } from './logo';
import { NavLinks, type NavItem } from './nav-links';
import { signOut, switchRole } from '@/lib/actions/auth';
import { logoHref } from '@/lib/roles';
import { cn } from '@/lib/ui/cn';
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
 * The app frame. No top header; the navigation moves with the screen:
 *
 *   < md   a bottom tab bar, where the thumb is: the four destinations with short labels, and
 *          the profile picture as the fifth tab (it opens the profile menu). No logo on phones;
 *          the bar is for getting around, and every page has its own title.
 *   md     a 4rem icon rail down the left. Labels stay in the DOM as accessible names (and a
 *          hover title), so nothing is lost to a screen reader.
 *   ≥ lg   a 15rem sidebar: logo, labelled nav, profile picture at the foot.
 *
 * The page reserves the bar's height on phones (--tabbar-space, app/globals.css), so the last
 * row of content, and anything sticky at the bottom, is never hidden under it.
 *
 * One <nav>, rendered once, at every width — two copies would give a screen-reader user two
 * identical "Main" landmarks to choose between.
 */
export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <aside
        aria-label="App"
        className={cn(
          // Phones: a bar across the bottom, padded clear of the home indicator.
          'fixed inset-x-0 bottom-0 z-nav flex border-t border-border-base bg-surface-raised/95 px-1 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md',
          // From md: a column down the left.
          'md:inset-x-auto md:inset-y-0 md:left-0 md:w-16 md:flex-col md:border-t-0 md:border-r md:bg-surface-raised md:px-0 md:pt-[max(1rem,env(safe-area-inset-top,0px))] md:pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:pl-[env(safe-area-inset-left,0px)] md:backdrop-blur-none',
          'lg:w-60',
        )}
      >
        <div className="hidden h-10 items-center justify-center md:flex lg:justify-start lg:px-5">
          <Logo href={logoHref(true)} compact className="lg:hidden" />
          <Logo href={logoHref(true)} className="hidden lg:inline-flex" />
        </div>

        <NavLinks items={NAV[user.activeRole]} unread={user.unread} />

        <div className="flex shrink-0 items-center justify-center px-2 md:mt-auto lg:justify-start lg:px-3">
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

      <div className="flex min-h-dvh flex-col pb-(--tabbar-space) md:pl-16 lg:pl-60">
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
