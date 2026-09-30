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

export function Avatar({
  name,
  size = 'md',
  className,
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold select-none',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        'border border-border-base bg-surface-sunken text-text-muted',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
