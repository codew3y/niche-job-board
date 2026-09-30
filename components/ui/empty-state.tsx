import type { LucideIcon } from 'lucide-react';
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
  icon?: LucideIcon;
  /** `pending` for "not ready yet", which must not look like "nothing here". */
  tone?: 'default' | 'pending';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-dashed px-6 py-12 text-center',
        tone === 'pending'
          ? 'border-accent/40 bg-accent-subtle/50'
          : 'border-border-strong bg-surface-raised/40',
        className,
      )}
    >
      {Icon && (
        <span
          aria-hidden="true"
          className={cn(
            'mx-auto mb-4 grid size-11 place-items-center rounded-md',
            tone === 'pending'
              ? 'bg-accent-subtle text-link'
              : 'bg-surface-sunken text-text-subtle',
          )}
        >
          <Icon size={20} />
        </span>
      )}
      <p className="font-display text-2xl font-semibold tracking-tight">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm text-text-muted text-pretty">{body}</div>
      {action && <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
