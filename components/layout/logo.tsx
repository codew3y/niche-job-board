import Image from 'next/image';
import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/**
 * The TechSelect logo: a shield with a lightning-bolt arrow, beside the TECHSELECT wordmark and
 * the "Tech careers | Job board" line. Supplied by the owner as one raster lockup.
 *
 * FILES — cut from that one image (trimmed, never redrawn):
 *   public/brand/logo-lockup.png       the full lockup, for light surfaces
 *   public/brand/logo-lockup-dark.png  the same, with the navy "TECH" and the tagline turned
 *                                      light so they read on dark surfaces; the blue stays
 *   public/brand/logo-mark-128.png     the shield alone, for the collapsed app rail
 *   app/icon.png, app/apple-icon.png   the shield as the browser-tab and iOS icons
 *
 * The source is 360px wide, so the lockup is kept at or below 180px wide in the UI to stay
 * sharp on 2x screens.
 */
const LOCKUP = { width: 360, height: 147 };

export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-mark-128.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      className={cn('shrink-0', className)}
    />
  );
}

/**
 * Both themes are rendered and CSS picks one (`dark:`), like the theme toggle: the right one
 * shows on the first frame, with no flash while the theme resolves.
 */
function Lockup({ height }: { height: number }) {
  const width = Math.round((LOCKUP.width / LOCKUP.height) * height);
  return (
    <>
      <Image
        src="/brand/logo-lockup.png"
        alt=""
        width={width}
        height={height}
        draggable={false}
        className="shrink-0 dark:hidden"
      />
      <Image
        src="/brand/logo-lockup-dark.png"
        alt=""
        width={width}
        height={height}
        draggable={false}
        className="hidden shrink-0 dark:block"
      />
    </>
  );
}

/**
 * The logo. Where it points is decided by the caller — the site header links it to the home
 * page, and inside the app it goes to /dashboard (`logoHref()`, lib/roles.ts).
 */
export function Logo({
  href,
  className,
  compact = false,
  size = 'md',
}: {
  href: string;
  className?: string;
  /** Icon-rail form: the shield alone; the name is kept as the link's accessible name. */
  compact?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <Link
      href={href}
      aria-label="TechSelect home"
      // The logo is a picture, never text: it cannot be selected or dragged out as an image
      // (the owner could highlight it when drag-selecting across the header).
      className={cn(
        'inline-flex items-center text-text select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none',
        className,
      )}
    >
      {compact ? <LogoMark size={32} /> : <Lockup height={size === 'lg' ? 64 : 48} />}
    </Link>
  );
}
