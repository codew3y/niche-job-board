import Image from 'next/image';
import Link from 'next/link';

import { WORDMARK } from './wordmark-path';
import { cn } from '@/lib/ui/cn';

/**
 * The techselect mark: a real photograph of a keycap, edited into a "select" key.
 *
 * SOURCE — "White computer keyboard showing white button" by Marcus Urbenz,
 * https://unsplash.com/photos/RrOkHOp4XOQ, Unsplash License (https://unsplash.com/license):
 * free to use and modify, commercially, without attribution. Credited anyway.
 *
 * EDITS — cropped to the single key; its printed "Cut" legend removed by patching clean
 * keycap surface from the same photo over it; recoloured to the brand blue with a multiply
 * blend, which keeps the photo's real light and texture; a white check printed on the key
 * face; corners rounded. Files: public/brand/logo-mark-{128,512}.png, app/icon.png (browser
 * tab), app/apple-icon.png (iOS, unrounded — iOS applies its own mask).
 *
 * NOTE: the Unsplash License is non-exclusive, so this mark cannot be registered as a
 * trademark, and the source photo remains available to anyone.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-mark-128.png"
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0', className)}
    />
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
