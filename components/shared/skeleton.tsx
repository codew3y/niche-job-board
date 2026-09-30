import { cn } from '@/lib/ui/cn';

/**
 * Loading skeletons ship with the list they belong to, never afterwards (docs/components.md).
 * Skeletons, not spinners, wherever the shape of the content is known: a skeleton says what is
 * coming and holds its space, so nothing shifts when it arrives (CLS).
 *
 * The pulse is opacity, which is composited — not a moving gradient, which repaints every
 * frame — and it stops under prefers-reduced-motion (globals.css).
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-skeleton rounded-sm bg-surface-sunken', className)}
    />
  );
}

function Busy({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    // role="status" makes the label legal on a div AND puts it in a live region, which is what a
    // loading state wants. aria-busy tells assistive tech the region is mid-update.
    <div role="status" aria-busy="true" aria-label={label} className={className}>
      {children}
    </div>
  );
}

export function JobCardSkeleton() {
  return (
    <div className="space-y-3 border-b border-border-base px-5 py-5 last:border-0">
      <div className="flex justify-between gap-4">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-14 rounded-md" />
      </div>
    </div>
  );
}

export function JobListSkeleton({
  rows = 5,
  label = 'Loading jobs',
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <Busy
      label={label}
      className="overflow-hidden rounded-lg border border-border-base bg-surface-raised"
    >
      {Array.from({ length: rows }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </Busy>
  );
}

/** A generic page skeleton: title, a summary row, then a list — the shape of most app pages. */
export function PageSkeleton({
  label = 'Loading',
  stats = false,
}: {
  label?: string;
  stats?: boolean;
}) {
  return (
    <Busy label={label}>
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      {stats && (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      )}
      <div className="mt-8 overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 4 }, (_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </Busy>
  );
}

/** A form skeleton: label + control pairs. */
export function FormSkeleton({
  label = 'Loading',
  fields = 5,
}: {
  label?: string;
  fields?: number;
}) {
  return (
    <Busy label={label} className="max-w-2xl">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 space-y-6">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className={cn('w-full rounded-md', i === 1 ? 'h-32' : 'h-11')} />
          </div>
        ))}
      </div>
    </Busy>
  );
}
