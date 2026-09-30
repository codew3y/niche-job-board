'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SITE_NAV } from './nav';
import { cn } from '@/lib/ui/cn';

/** The header's page links, with the current page marked for sighted and screen-reader users. */
export function SiteNavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-0.5">
      {SITE_NAV.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'inline-flex h-10 items-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors duration-fast ease-out',
                // The current page is marked by weight AND a tinted fill, never colour alone.
                active
                  ? 'bg-primary-subtle font-semibold text-primary'
                  : 'text-text-muted hover:bg-surface-sunken hover:text-text',
              )}
            >
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
