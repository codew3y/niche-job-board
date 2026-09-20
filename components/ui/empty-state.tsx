import type { ReactNode } from 'react';

/**
 * Empty states are written alongside the list they belong to, never bolted on later
 * (docs/components.md). An empty state added afterwards is always worse, because by then
 * nobody remembers what the user was trying to do when they hit it.
 */
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[--radius] border border-dashed border-border-strong p-10 text-center">
      <p className="font-medium">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-text-muted text-pretty">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
