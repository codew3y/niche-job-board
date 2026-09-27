import { cn } from '@/lib/ui/cn';

/**
 * An initials avatar.
 *
 * The schema has no profile photo and this rebuild does not add one (DESIGN.md §7). What it can
 * do is give each person and company a stable, distinguishable mark — the same name always gets
 * the same hue — so a list of applicants or conversations is scannable by shape, not only by
 * reading. Hues are drawn from a narrow warm-to-cool band at a fixed lightness so every one
 * keeps its text contrast.
 */
const HUES = [38, 70, 152, 190, 250, 300, 12, 110];

function hueFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length]!;
}

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
  const hue = hueFor(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold select-none',
        size === 'sm' && 'size-8 text-xs',
        size === 'md' && 'size-10 text-sm',
        size === 'lg' && 'size-14 text-lg',
        // Only the HUE comes from the name; lightness and chroma come from the theme, so every
        // hue has identical contrast, and dark mode gets a deep chip instead of a glaring one.
        'bg-[oklch(90%_0.05_var(--avatar-h))] text-[oklch(32%_0.08_var(--avatar-h))]',
        'dark:bg-[oklch(32%_0.06_var(--avatar-h))] dark:text-[oklch(90%_0.05_var(--avatar-h))]',
        className,
      )}
      style={{ '--avatar-h': hue } as React.CSSProperties}
    >
      {initials(name)}
    </span>
  );
}
