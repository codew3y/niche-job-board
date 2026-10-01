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
 * The app navigation. On phones, tabs in the bottom bar: icon over a short label, each tab an
 * equal share of the width and at least 4rem tall. On the md rail, icons only; from lg, icon
 * and label side by side. The label is always in the DOM: visually hidden on the rail, so it
 * is still each link's accessible name.
 *
 * No animation on the active state: navigation is used tens of times a session, and motion on
 * a frequent action reads as lag.
 */
export function NavLinks({ items, unread }: { items: NavItem[]; unread: number }) {
  const pathname = usePathname();
  // Longest matching prefix wins, so /dashboard/client/jobs lights "My jobs", not "Home".
  const active = items
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      aria-label="Main"
      className="flex flex-1 md:mt-8 md:flex-none md:flex-col md:gap-1 md:px-2 lg:px-3"
    >
      {items.map(({ href, label, icon }) => {
        const isActive = href === active;
        const showBadge = href === '/dashboard/messages' && unread > 0;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              // Phones: a tab, icon above a small label.
              'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 rounded-md text-[0.6875rem] leading-none transition-colors duration-fast ease-out',
              // md rail and lg sidebar: a row.
              'md:h-10 md:min-h-0 md:flex-none md:flex-row md:gap-3 md:text-sm md:leading-normal lg:justify-start lg:px-3',
              '[&_svg]:size-5 [&_svg]:shrink-0 md:[&_svg]:size-[1.125rem]',
              isActive
                ? 'font-semibold text-primary md:bg-primary-subtle'
                : 'text-text-muted hover:text-text md:hover:bg-surface-sunken',
            )}
          >
            <span aria-hidden="true">{icon}</span>
            <span className="md:sr-only lg:not-sr-only">{label}</span>
            {showBadge && (
              <span className="absolute top-2 left-[calc(50%+0.375rem)] min-w-4 rounded-full bg-accent px-1 text-center text-[0.6875rem] leading-4 font-semibold text-accent-text tabular-nums md:top-1 md:right-1 md:left-auto lg:static lg:ml-auto">
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
