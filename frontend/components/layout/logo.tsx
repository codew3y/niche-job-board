import Image from 'next/image';

import { cn } from '@/lib/ui/cn';
import { PageLink } from '@/components/shared/page-link';

/**
 * The TechSelect logo: the shield with a lightning-bolt arrow, beside the name set as live text.
 *
 * WHY NOT THE FULL LOCKUP. The owner's raster lockup (public/brand/logo-lockup*.png) carries a
 * "Tech careers | Job board" line that is unreadable at header size. With the owner's approval
 * (October 2026 redesign) the interface uses the shield mark plus the name in Geist instead:
 * sharp at any size, correct in both themes without a second file, and selectable as text is
 * not an issue because the whole lockup sits inside a link. The lockup files stay in
 * public/brand for anything off-screen (social cards, documents).
 *
 * FILES
 *   public/brand/logo-mark-128.png     the shield alone (cut from the owner's lockup, never
 *                                      redrawn); 128px source, shown at 28-32px, sharp on 2x
 *   frontend/app/icon.png, frontend/app/apple-icon.png   the shield as the browser-tab and iOS icons
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/logo-mark-128.png"
      alt=""
      width={size}
      height={size}
      draggable={false}
      // In the header on every page, so loaded straight away rather than lazily.
      loading="eager"
      className={cn('shrink-0', className)}
    />
  );
}

/**
 * The logo. Where it points is decided by the caller: the site header links it to the home
 * page, and inside the app it goes to /dashboard (`logoHref()`, backend/src/roles.ts).
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
    <PageLink
      href={href}
      aria-label="TechSelect home"
      // The mark cannot be dragged out as an image, and the name is not selected when someone
      // drag-selects across the header.
      className={cn(
        'pressable inline-flex items-center gap-2.5 rounded-md text-text select-none [-webkit-touch-callout:none] [&_img]:pointer-events-none',
        className,
      )}
    >
      <LogoMark size={compact ? 32 : size === 'lg' ? 36 : 30} />
      {!compact && (
        <span
          aria-hidden="true"
          className={cn('font-semibold tracking-tight', size === 'lg' ? 'text-xl' : 'text-base')}
        >
          TechSelect
        </span>
      )}
    </PageLink>
  );
}
