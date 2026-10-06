import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * Empty states are written alongside the list they belong to, never bolted on later
 * (docs/components.md). An empty state added afterwards is always worse, because by then
 * nobody remembers what the user was trying to do when they hit it.
 *
 * Each one says what is true and what to do next. The product's rule is that "nothing yet" and
 * "nothing fits" are different messages — this component just gives both the same dignity.
 */
export function EmptyState({
  title,
  body,
  action,
  icon: Icon,
  tone = 'default',
  className,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
  icon?: PhosphorIcon;
  /** `pending` for "not ready yet", which must not look like "nothing here". */
  tone?: 'default' | 'pending';
  className?: string;
}) {
  return (
    <div
      className={cn(
        // A quiet well, not a dashed box: one Phosphor icon on a tile, a line that says what is
        // true, and one way forward (the redesign's empty-state rule). The colour is in the icon,
        // not the background.
        'rounded-xl border border-border-base px-6 py-14 text-center',
        tone === 'pending' ? 'bg-accent-subtle' : 'bg-surface-sunken',
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            'mx-auto mb-5 grid size-12 place-items-center rounded-xl border border-border-base bg-surface-raised shadow-sm',
            tone === 'pending' ? 'text-accent' : 'text-primary',
          )}
        >
          <Icon size={22} weight="duotone" />
        </span>
      )}
      <p className="text-xl font-semibold tracking-tight">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-text-muted">{body}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
