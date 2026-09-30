import Link from 'next/link';

import { SITE_NAV } from './nav';
import { Logo } from '@/components/layout/logo';

/** The public site's footer: the same pages as the header, plus the legal pages. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-base">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1fr_auto_auto] sm:px-6">
        <div className="max-w-xs">
          <Logo href="/" />
          <p className="mt-3 text-sm text-text-muted text-pretty">
            A job board for software, web and automation work. Open to every developer; clients
            decide.
          </p>
        </div>

        <nav aria-label="Pages">
          <p className="text-sm font-semibold">Platform</p>
          <ul className="mt-3 space-y-2 text-sm">
            {SITE_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="text-text-muted hover:text-text">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="text-sm font-semibold">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/privacy" className="text-text-muted hover:text-text">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-text-muted hover:text-text">
                Terms
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
