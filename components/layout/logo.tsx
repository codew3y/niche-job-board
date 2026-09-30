import Link from 'next/link';

import { WORDMARK } from './wordmark-path';
import { cn } from '@/lib/ui/cn';

/**
 * The brand blue, fixed. Not `--accent`: the accent lightens in dark mode for text contrast,
 * and white glyphs on that lighter blue lost contrast. The mark is a brand asset, so it stays
 * one colour in both themes.
 */
const BRAND = '#2f5bd8';

/**
 * The techselect mark: a selection frame (four corner brackets) around a check — choosing,
 * from a set, the one that fits. Drawn on a 32-unit grid; readable from 16px (the browser tab,
 * app/icon.svg) up. The same artwork with the wordmark is /public/logo.svg.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <rect width="32" height="32" rx="8" fill={BRAND} />
      <path
        d="M7 12V7h5M20 7h5v5M25 20v5h-5M12 25H7v-5M12.6 16.4l2.6 2.6 4.8-5.6"
        fill="none"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The wordmark, as outlines (see wordmark-path.ts). `currentColor`, so it follows the theme. */
function Wordmark({ height }: { height: number }) {
  return (
    <svg
      height={height}
      width={(WORDMARK.width / WORDMARK.height) * height}
      viewBox={`0 0 ${WORDMARK.width} ${WORDMARK.height}`}
      aria-hidden="true"
      className="shrink-0"
    >
      <path d={WORDMARK.d} fill="currentColor" />
    </svg>
  );
}

/**
 * The logo: mark + wordmark. Where it points is decided by the caller — the site header links
 * it to the home page, and inside the app it goes to /dashboard (`logoHref()`, lib/roles.ts).
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
  size?: 'md' | 'lg';
}) {
  const mark = size === 'lg' ? 36 : 28;
  return (
    <Link
      href={href}
      aria-label="techselect — home"
      className={cn('inline-flex items-center gap-2 text-text', className)}
    >
      <LogoMark size={compact ? 32 : mark} />
      {/* Cap height matched to the mark: roughly 60% of its size reads as one lockup. */}
      {!compact && <Wordmark height={size === 'lg' ? 22 : 17} />}
    </Link>
  );
}
