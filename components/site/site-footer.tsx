import Link from 'next/link';

import { SITE_NAV } from './nav';
import { CONTAINER } from './page-parts';
import { Logo } from '@/components/layout/logo';
import { cn } from '@/lib/ui/cn';

/** The public site's footer: the same pages as the header, plus the legal pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-base">
      {/* One column on phones; two link columns under the logo block from `sm`; all three in a
          row from `lg`. Three columns at `sm` overflowed at 200% text zoom (e2e/accessibility). */}
      <div
        className={cn(
          CONTAINER,
          'grid gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto] lg:gap-24 lg:py-20',
        )}
      >
        <div className="max-w-xs sm:col-span-2 lg:col-span-1">
          <Logo href="/" />
          <p className="mt-4 text-sm text-text-muted text-pretty">
            A job board for software, web and automation work. Open to every developer, and clients
            make the call.
          </p>
        </div>

        <nav aria-label="Pages">
          <p className="font-mono text-xs text-text-subtle">Platform</p>
          <ul className="mt-2 grid text-sm">
            {SITE_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="inline-flex min-h-10 items-center text-text-muted transition-colors duration-fast ease-out hover:text-text"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="font-mono text-xs text-text-subtle">Legal</p>
          <ul className="mt-2 grid text-sm">
            <li>
              <Link
                href="/privacy"
                className="inline-flex min-h-10 items-center text-text-muted transition-colors duration-fast ease-out hover:text-text"
              >
                Privacy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="inline-flex min-h-10 items-center text-text-muted transition-colors duration-fast ease-out hover:text-text"
              >
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
