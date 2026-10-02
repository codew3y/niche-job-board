import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/**
 * A summary number. Linked when there is somewhere to go — a count you cannot click through to
 * is a number that asks a question and refuses to answer it.
 *
 * The figure is large Geist with tabular numerals, so a column of stats lines up. Flat: a
 * hairline, no resting shadow; a linked stat lifts on hover like any other link target.
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
  icon?: PhosphorIcon;
  emphasis?: boolean;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-2 text-sm text-text-muted">
        {Icon && <Icon aria-hidden="true" size={16} className="text-text-subtle" />}
        {label}
      </dt>
      <dd className={cn('mt-4 text-display-sm leading-none tabular-nums', emphasis && 'text-link')}>
        {value}
      </dd>
    </>
  );
  const shell = 'block rounded-lg border border-border-base bg-surface-raised p-5';
  return href ? (
    <Link href={href} className={cn(shell, 'pressable liftable hover:border-border-strong')}>
      <dl>{body}</dl>
    </Link>
  ) : (
    <dl className={shell}>{body}</dl>
  );
}
