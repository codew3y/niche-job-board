import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import Link from 'next/link';

import { cn } from '@/lib/ui/cn';

/** Icon tile colours, one per stat in a row, so four figures are not four grey boxes. */
const TONES = {
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
} as const;
export type StatTone = keyof typeof TONES;

/**
 * A summary number. Linked when there is somewhere to go — a count you cannot click through to
 * is a number that asks a question and refuses to answer it.
 *
 * The figure is large Geist with tabular numerals, so a column of stats lines up. Flat: a
 * hairline, no resting shadow; a linked stat lifts on hover like any other link target. The icon
 * sits on a tinted tile in the stat's tone.
 */
export function Stat({
  label,
  value,
  href,
  icon: Icon,
  emphasis,
  tone = 'blue',
}: {
  label: string;
  value: number | string;
  href?: string;
  icon?: PhosphorIcon;
  emphasis?: boolean;
  tone?: StatTone;
}) {
  const body = (
    <>
      <dt className="flex items-center gap-2.5 text-sm text-text-muted">
        {Icon && (
          <span
            aria-hidden="true"
            className={cn('grid size-8 shrink-0 place-items-center rounded-lg', TONES[tone])}
          >
            <Icon size={16} weight="duotone" />
          </span>
        )}
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
