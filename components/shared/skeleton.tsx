/**
 * Loading skeletons ship with the list they belong to, never afterwards
 * (docs/components.md). `animate-pulse` is removed under prefers-reduced-motion by the
 * global rule in globals.css.
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-[--radius-sm] bg-surface-sunken ${className}`} />;
}

export function JobCardSkeleton() {
  return (
    <div className="space-y-3 border-b border-border-base p-5 last:border-0">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function JobListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="overflow-hidden rounded-[--radius] border border-border-base"
      /* A plain div cannot take aria-label: ARIA forbids it on an element with no role, so
         axe flags it and a screen reader announces nothing. role="status" makes the label
         legal AND puts it in a live region, which is what a loading state wants. */
      role="status"
      aria-busy="true"
      aria-label="Loading jobs"
    >
      {Array.from({ length: rows }, (_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  );
}
