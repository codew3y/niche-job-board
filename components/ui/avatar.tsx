import Image from 'next/image';

import { cn } from '@/lib/ui/cn';

/**
 * An initials avatar.
 *
 * Neutral on purpose: the palette is greys plus one accent, and a rainbow of name-derived hues
 * would be eight accents. The initials still make a list scannable by shape. Where a real photo
 * exists (the signed-in user's provider picture) the caller renders that instead.
 */
function initials(name: string) {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return '?';
  return (words[0]![0]! + (words[1]?.[0] ?? '')).toUpperCase();
}

const PX = { sm: 32, md: 40, lg: 56, xl: 80 } as const;

/**
 * A person's photo or a company's logo when there is one (migration 0025: only images from the
 * owner's own upload folder), and initials otherwise. Decorative either way: the name is always
 * written next to it, so the image has empty alt text and the initials are aria-hidden.
 *
 * next/image, not <img>: the image host allow-list in next.config.ts is what keeps an avatar
 * from loading from anywhere but our own storage.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string;
  /** An uploaded photo or logo. Falls back to initials when absent. */
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const box = cn(
    'shrink-0 rounded-full',
    size === 'sm' && 'size-8',
    size === 'md' && 'size-10',
    size === 'lg' && 'size-14',
    size === 'xl' && 'size-20',
    className,
  );
  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={PX[size]}
        height={PX[size]}
        className={cn(box, 'bg-surface-sunken object-cover')}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        box,
        'grid place-items-center font-medium select-none',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        size === 'lg' && 'text-lg',
        size === 'xl' && 'text-2xl',
        'bg-primary-subtle text-primary',
      )}
    >
      {initials(name)}
    </span>
  );
}
