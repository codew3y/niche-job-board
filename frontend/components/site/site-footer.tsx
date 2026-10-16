import { SITE_NAV } from './nav';
import { CONTAINER } from './page-parts';
import { Logo } from '@/components/layout/logo';
import { PageLink } from '@/components/shared/page-link';
import { clientEnv } from '@techselect/backend/env';
import { cn } from '@/lib/ui/cn';

const LINK =
  'inline-flex min-h-10 items-center text-text-muted transition-colors duration-fast ease-out hover:text-text';

/** Where to start, by intent: the two lists on Browse, and the two ways in. */
const START = [
  { href: '/browse?type=jobs', label: 'Find work' },
  { href: '/browse?type=developers', label: 'Find developers' },
  { href: '/signup?role=talent', label: 'Create a profile' },
  { href: '/signup?role=client', label: 'Post a brief' },
] as const;

/**
 * The public site's footer: the brand and what it stands for, then three link columns (the
 * header's pages, where to start, and the legal pages), and a bottom row with the year and the
 * product's two promises. One column on phones; the brand above two-up link columns from `sm`
 * (three at `sm` overflowed at 200% text zoom, frontend/e2e/accessibility);
 * everything in one row from `lg`.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border-base bg-surface-sunken/60">
      <div
        className={cn(
          CONTAINER,
          'grid gap-10 pt-14 pb-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_auto_auto_auto] lg:gap-20 lg:pt-16',
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
                <PageLink href={href} className={LINK}>
                  {label}
                </PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Get started">
          <p className="font-mono text-xs text-text-subtle">Get started</p>
          <ul className="mt-2 grid text-sm">
            {START.map(({ href, label }) => (
              <li key={href}>
                <PageLink href={href} className={LINK}>
                  {label}
                </PageLink>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="font-mono text-xs text-text-subtle">Legal</p>
          <ul className="mt-2 grid text-sm">
            <li>
              <PageLink href="/privacy" className={LINK}>
                Privacy
              </PageLink>
            </li>
            <li>
              <PageLink href="/terms" className={LINK}>
                Terms
              </PageLink>
            </li>
            {clientEnv.NEXT_PUBLIC_CONTACT_EMAIL && (
              <li>
                <a href={`mailto:${clientEnv.NEXT_PUBLIC_CONTACT_EMAIL}`} className={LINK}>
                  Contact
                </a>
              </li>
            )}
          </ul>
        </nav>
      </div>

      <div className={cn(CONTAINER, 'pb-[max(2rem,env(safe-area-inset-bottom,0px))]')}>
        <div className="flex flex-col gap-2 border-t border-border-base pt-6 text-sm text-text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TechSelect</p>
          <p>No fees. No middleman. Every developer may list.</p>
        </div>
      </div>
    </footer>
  );
}
