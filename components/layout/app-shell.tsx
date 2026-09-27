import { Briefcase, Building2, House, MessageSquare, Search, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { AccountMenu } from './account-menu';
import { NavLinks, type NavItem } from './nav-links';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { signOut, switchRole } from '@/lib/actions/auth';

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
const NAV: Record<ShellUser['activeRole'], NavItem[]> = {
  talent: [
    { href: '/dashboard/talent', label: 'Home', icon: <House /> },
    { href: '/jobs', label: 'Search', icon: <Search /> },
    { href: '/dashboard/talent/applications', label: 'Jobs', icon: <Briefcase /> },
    { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
    { href: '/dashboard/talent/profile', label: 'Profile', icon: <UserRound /> },
  ],
  client: [
    { href: '/dashboard/client', label: 'Home', icon: <House /> },
    { href: '/talent', label: 'Search', icon: <Search /> },
    { href: '/dashboard/client/jobs', label: 'Jobs', icon: <Briefcase /> },
    { href: '/dashboard/messages', label: 'Messages', icon: <MessageSquare /> },
    { href: '/dashboard/client/profile', label: 'Profile', icon: <Building2 /> },
  ],
};

export function AppShell({ user, children }: { user: ShellUser; children: ReactNode }) {
  const home = user.activeRole === 'client' ? '/dashboard/client' : '/dashboard/talent';

  return (
    // The bottom padding on phones reserves the tab bar and the home indicator, so the last row
    // of every page — and the footer — scrolls clear of the bar instead of sitting under it.
    <div className="flex min-h-dvh flex-col pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom,0px))] sm:pb-0">
      {/*
        No backdrop-filter below `sm`: a filter makes the header the containing block for its
        fixed-position children, which would trap the tab bar inside the header instead of
        pinning it to the bottom of the screen.
      */}
      <header className="sticky top-0 z-sticky border-b border-border-base bg-surface pt-[env(safe-area-inset-top,0px)] sm:bg-surface/85 sm:backdrop-blur-md">
        {/* Wraps rather than forcing one line: at 200% text zoom a desktop-width window keeps its
            desktop breakpoint while the text doubles, and a no-wrap row runs off screen. */}
        <div className="gutter mx-auto flex min-h-(--nav-height) max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 py-2">
          {/*
            Inside the app the logo goes to the DASHBOARD, not the marketing page.
            It used to go to `/`, so a signed-in user clicking it landed on a page inviting
            them to "Get started" — the product apparently forgetting who they were. A logo
            inside an application is a home button for that application.
          */}
          <Link href={home} className="shrink-0 font-serif text-[1.625rem] leading-none">
            TechSelect
          </Link>

          <NavLinks items={NAV[user.activeRole]} unread={user.unread} />

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <ThemeToggle />
            <AccountMenu
              displayName={user.displayName}
              activeRole={user.activeRole}
              hasTalent={user.hasTalent}
              hasClient={user.hasClient}
              switchRole={switchRole}
              signOut={signOut}
            />
          </div>
        </div>
      </header>

      <main id="main" className="gutter mx-auto w-full max-w-6xl flex-1 py-8 sm:py-10">
        {children}
      </main>

      <footer className="border-t border-border-base">
        <div className="gutter mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 py-6 text-sm text-text-subtle">
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
