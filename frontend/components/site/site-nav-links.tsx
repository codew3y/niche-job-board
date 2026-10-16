'use client';

import { usePathname } from 'next/navigation';

import { SITE_NAV } from './nav';
import { PageLink } from '@/components/shared/page-link';
import { cn } from '@/lib/ui/cn';

/**
 * The header's page links as one segmented pill: a sunken track, with the current page as the
 * raised segment. Marked for screen readers with aria-current, and by weight and fill, never by
 * colour alone.
 */
export function SiteNavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-0.5 rounded-full border border-border-base bg-surface-sunken/70 p-1">
      {SITE_NAV.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <PageLink
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-9 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-fast ease-out',
                active
                  ? 'bg-surface-raised font-semibold text-text shadow-sm'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {label}
            </PageLink>
          </li>
        );
      })}
    </ul>
  );
}
