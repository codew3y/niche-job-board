'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { SITE_NAV } from './nav';
import { cn } from '@/lib/ui/cn';

/** The header's page links, with the current page marked for sighted and screen-reader users. */
export function SiteNavLinks() {
  const pathname = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {SITE_NAV.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors duration-fast ease-out',
                active
                  ? 'font-semibold text-text'
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
