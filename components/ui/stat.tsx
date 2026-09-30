import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/**
 * A summary number. Linked when there is somewhere to go — a count you cannot click through to
 * is a number that asks a question and refuses to answer it.
 *
 * The figure is set in the display face (Outfit) with tabular numerals, so a column of stats
 * lines up. Outfit's "1" has a flag and cannot be misread as a lowercase "l".
 */
export function Stat({
  label,
  value,
  href,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: number | string;
  href?: string;
  icon?: LucideIcon;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-2 text-sm text-text-muted">
        {Icon && <Icon aria-hidden="true" size={16} className="text-text-subtle" />}
        {label}
      </dt>
      <dd
        className={cn(
          'mt-2 font-display text-3xl leading-none font-semibold tracking-tight tabular-nums',
          emphasis && 'text-link',
        )}
      >
        {value}
      </dd>
    </>
  );
  const shell =
    'block rounded-lg border border-border-base bg-surface-raised p-4 transition-[border-color,box-shadow] duration-base ease-out';
  return href ? (
    <Link href={href} className={cn(shell, 'hover:border-border-strong hover:shadow-sm')}>
      <dl>{body}</dl>
    </Link>
  ) : (
    <dl className={shell}>{body}</dl>
  );
}
