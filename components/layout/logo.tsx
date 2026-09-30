import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/**
 * The techselect mark: a rounded square in the accent colour holding a code bracket and a
 * check — "code" and "select" — drawn on a 24-unit grid so it stays crisp from 20px to 40px.
 * The same artwork, with the wordmark, is saved as /public/logo.svg for use outside React.
 *
 * `currentColor` is never used for the square, so the mark keeps the brand colour on any
 * background; the glyphs are always white on it.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="24" height="24" rx="6" className="fill-accent" />
      <path
        d="M9.5 7.5 5 12l4.5 4.5"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m12 12.5 2.25 2.25L19 10"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The logo: mark + wordmark. Every screen that shows it goes through here, so where it points
 * is decided by the caller — the site header links it to the home page, and inside the app it
 * goes to /dashboard (`logoHref()`, lib/roles.ts).
 */
export function Logo({
  href,
  className,
  compact = false,
  size = 'md',
}: {
  href: string;
  className?: string;
  /** Icon-rail form: the mark alone; the name is kept as the link's accessible name. */
  compact?: boolean;
  /** A prop rather than a class override: `cn` does not merge conflicting utilities. */
  size?: 'md' | 'lg';
}) {
  const mark = size === 'lg' ? 36 : 28;
  return (
    <Link
      href={href}
      aria-label="techselect — home"
      className={cn(
        'inline-flex items-center gap-2 font-semibold tracking-tight text-text',
        size === 'lg' ? 'text-2xl' : 'text-lg',
        className,
      )}
    >
      <LogoMark size={compact ? 32 : mark} />
      {!compact && <span aria-hidden="true">techselect</span>}
    </Link>
  );
}
