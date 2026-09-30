import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/**
 * The wordmark. Every screen that shows it goes through here, so where it points is decided
 * once: `href` comes from `logoHref()` (lib/roles.ts) — /dashboard when signed in, / when not.
 * A signed-in user is never sent to the front door by the logo; /dashboard resolves their role.
 */
export function Logo({
  href,
  className,
  compact = false,
  size = 'md',
}: {
  href: string;
  className?: string;
  /** Icon-rail form: a single letter mark, the full name kept for assistive tech. */
  compact?: boolean;
  /** `lg` is the landing page's wordmark. A prop rather than a class override: `cn` does not
   *  merge conflicting utilities, so a passed `text-3xl` would fight the default `text-lg`. */
  size?: 'md' | 'lg';
}) {
  return (
    <Link
      href={href}
      aria-label="techselect — home"
      className={cn(
        'inline-flex items-center font-semibold tracking-tight',
        size === 'lg' ? 'text-3xl sm:text-4xl' : 'text-lg',
        className,
      )}
    >
      {compact ? (
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-md bg-surface-inverse text-base text-text-inverse"
        >
          t
        </span>
      ) : (
        <span aria-hidden="true">techselect</span>
      )}
    </Link>
  );
}
