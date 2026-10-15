'use client';

import { List, X } from '@phosphor-icons/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useState } from 'react';

import { SITE_NAV } from './nav';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';

/**
 * The header below `lg` (phones and tablets): the page links and the two auth buttons collapse behind one toggle.
 *
 * A disclosure (button + `aria-expanded` + `aria-controls`), not a modal: the panel pushes the
 * page down rather than trapping focus, so there is nothing to escape from. It closes when a
 * link in it is followed, and on Escape.
 */
export function MobileMenu({
  dashboardHref,
  current,
}: {
  dashboardHref: string | null;
  /** The auth page being shown, whose own button is left out. */
  current?: 'login' | 'signup';
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
        className="pressable grid size-10 place-items-center rounded-md text-text-muted hover:bg-surface-sunken hover:text-text"
      >
        {open ? <X aria-hidden="true" size={20} /> : <List aria-hidden="true" size={20} />}
      </button>

      <div
        id={panelId}
        hidden={!open}
        // Hangs from the floating header bar as a card of its own, the same width as the bar.
        className="absolute inset-x-0 top-full mt-2 rounded-lg border border-border-base bg-surface-raised px-2 pb-3 shadow-md"
      >
        <nav aria-label="Site">
          <ul className="flex flex-col py-2">
            {SITE_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === href ? 'page' : undefined}
                  className={cn(
                    'flex min-h-11 items-center rounded-md px-3 font-medium transition-colors duration-fast ease-out',
                    pathname === href
                      ? 'bg-primary-subtle font-semibold text-primary'
                      : 'text-text-muted hover:bg-surface-sunken hover:text-text',
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="grid gap-2 border-t border-border-base px-1 pt-3 sm:grid-cols-2">
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              onClick={() => setOpen(false)}
              className={buttonStyles({ className: 'w-full' })}
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              {current !== 'login' && (
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className={buttonStyles({ variant: 'secondary', className: 'w-full' })}
                >
                  Log in
                </Link>
              )}
              {current !== 'signup' && (
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className={buttonStyles({ className: 'w-full' })}
                >
                  Sign up
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
