import { cn } from '@/lib/ui/cn';

/**
 * Loading skeletons ship with the list they belong to, never afterwards.
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
      // `cn` is plain clsx (no tailwind-merge), so a caller's radius would tie with the default
      // one in the cascade. The default applies only when the caller names none.
      className={cn(
        'animate-skeleton bg-surface-sunken',
        !/\brounded-/.test(className) && 'rounded-sm',
        className,
      )}
    />
  );
}

/** The live region every skeleton sits in. Exported so a route's loading.tsx can compose its own
 * shape from `Skeleton` blocks and still announce itself the same way. */
export function Busy({
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
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
    </div>
  );
}

/** A developer row in Browse: avatar tile (from sm), headline + rate, facts, bio, tags + save. */
export function TalentCardSkeleton() {
  return (
    <div className="flex gap-4 border-b border-border-base px-5 py-5 last:border-0 sm:px-6">
      <Skeleton className="hidden size-10 shrink-0 rounded-md sm:block" />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
          <Skeleton className="h-10 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * The Browse results while they stream: the result count line, then the list panel in the
 * shape of the type being loaded. The "All" view shows both sections, as the page will.
 */
export function BrowseResultsSkeleton({ type }: { type: 'all' | 'jobs' | 'developers' }) {
  const list = (kind: 'jobs' | 'developers', rows: number) => (
    <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
      {Array.from({ length: rows }, (_, i) =>
        kind === 'jobs' ? <JobCardSkeleton key={i} /> : <TalentCardSkeleton key={i} />,
      )}
    </div>
  );
  return (
    <Busy label="Loading results">
      {type === 'all' ? (
        <div className="space-y-10">
          {(['jobs', 'developers'] as const).map((kind) => (
            <div key={kind}>
              <Skeleton className="mb-3 h-5 w-28" />
              {list(kind, 3)}
            </div>
          ))}
        </div>
      ) : (
        <>
          <Skeleton className="mb-3 h-4 w-24" />
          {list(type, 5)}
        </>
      )}
    </Busy>
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
