'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/ui/cn';

/**
 * `icon` is a rendered ELEMENT, not a component. This list is built in a Server Component and
 * handed to this Client Component, and a component is a function — which cannot cross that
 * boundary ("Functions cannot be passed directly to Client Components"). An element can.
 */
export type NavItem = { href: string; label: string; icon: ReactNode };

/**
 * The ONE main navigation, rendered once.
 *
 * It used to be rendered twice — a desktop copy and a mobile copy, both `aria-label="Main"` —
 * which gives a screen-reader user two identical landmarks to choose between. Now one <nav> is
 * a row of links in the header on wide screens and a native-style tab bar pinned to the bottom
 * on phones, where the thumb is (mobile-native).
 *
 * The tab bar pads itself by the home-indicator inset, and the page reserves its height
 * (`pb-[var(--tabbar-space)]` on <main>) so the last row of content is never hidden under it.
 *
 * No animation on the active indicator: navigation is used tens of times a session, and a
 * sliding underline would be motion on a frequent action (frequency rule).
 */
export function NavLinks({ items, unread }: { items: NavItem[]; unread: number }) {
  const pathname = usePathname();
  // Longest matching prefix wins, so /dashboard/client/jobs lights "Jobs", not "Home".
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Main"
      className={cn(
        // Phone: a bottom tab bar.
        'fixed inset-x-0 bottom-0 z-nav grid grid-cols-5 border-t border-border-base bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-md',
        // Desktop: links in the header row.
        'sm:static sm:z-auto sm:flex sm:flex-1 sm:items-center sm:gap-1 sm:border-0 sm:bg-transparent sm:pb-0 sm:backdrop-blur-none',
      )}
    >
      {items.map(({ href, label, icon }) => {
        const isActive = href === active;
        const showBadge = href === '/dashboard/messages' && unread > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center justify-center gap-0.5 py-2 text-2xs font-medium select-none',
              // Press feedback on the phone tab bar: an instant tint on pointer-down, not an
              // animation — this is pressed tens of times a session (mobile-native §5).
              'active:bg-surface-sunken sm:active:bg-transparent',
              'min-h-[var(--tabbar-height)] transition-colors duration-fast ease-out',
              isActive ? 'text-accent' : 'text-text-subtle hover:text-text',
              'sm:min-h-0 sm:flex-row sm:gap-2 sm:rounded-full sm:px-3.5 sm:py-2 sm:text-sm',
              isActive ? 'sm:bg-surface-sunken sm:text-text' : 'sm:hover:bg-surface-sunken',
            )}
          >
            <span aria-hidden="true" className="sm:hidden [&_svg]:size-[1.375rem]">
              {icon}
            </span>
            {label}
            {showBadge && (
              <span
                className={cn(
                  'rounded-full bg-accent px-1.5 text-2xs leading-4 font-semibold text-accent-text tabular-nums',
                  'absolute top-1.5 left-[calc(50%+0.5rem)] sm:static',
                )}
              >
                {unread > 99 ? '99+' : unread}
                <span className="sr-only"> unread messages</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
