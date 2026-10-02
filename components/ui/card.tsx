import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * A card: a flat raised surface with a hairline (minimalist-ui), no resting shadow. Elevation is
 * reserved for things that float (menus, sheets, toasts). A page of shadowed cards reads as a
 * pile; a page of ruled ones reads as a document.
 *
 * `interactive` is for a card that is itself a single link target: a 2px lift and a faint
 * shadow on the spring (globals.css `liftable`), on hover-capable pointers only.
 */
export function Card({
  className,
  tone = 'raised',
  interactive,
  ...props
}: ComponentProps<'div'> & { tone?: 'raised' | 'sunken' | 'plain'; interactive?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border',
        tone === 'raised' && 'border-border-base bg-surface-raised',
        tone === 'sunken' && 'border-transparent bg-surface-sunken',
        tone === 'plain' && 'border-border-base',
        interactive && 'liftable hover:border-border-strong',
        className,
      )}
      {...props}
    />
  );
}

/** Card header row: a title on the left, an action on the right, a rule underneath. */
export function CardHeader({
  title,
  description,
  action,
  as: Heading = 'h2',
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-border-base px-6 py-5">
      <div className="min-w-0">
        <Heading className="font-semibold tracking-tight">{title}</Heading>
        {description && <p className="mt-0.5 text-sm text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
