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
 * The sidebar navigation. Icons only on the rail (< lg), icon + label from lg. The label is
 * always in the DOM: visually hidden on the rail, so it is still each link's accessible name.
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
    <nav aria-label="Main" className="mt-8 flex flex-col gap-1 px-2 lg:px-3">
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
              'relative flex h-10 items-center justify-center gap-3 rounded-md text-sm transition-colors duration-fast ease-out lg:justify-start lg:px-3',
              '[&_svg]:size-[1.125rem] [&_svg]:shrink-0',
              isActive
                ? 'bg-primary-subtle font-semibold text-primary'
                : 'text-text-muted hover:bg-surface-sunken hover:text-text',
            )}
          >
            <span aria-hidden="true">{icon}</span>
            <span className="sr-only lg:not-sr-only">{label}</span>
            {showBadge && (
              <span className="absolute top-1 right-1 min-w-4 rounded-full bg-accent px-1 text-center text-[0.6875rem] leading-4 font-semibold text-accent-text tabular-nums lg:static lg:ml-auto">
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
