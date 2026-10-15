import { Busy, Skeleton } from '@/components/shared/skeleton';

/** Saved jobs: the header, the count, then a row per job with its Saved toggle. */
export default function Loading() {
  return (
    <Busy label="Loading your saved jobs" className="max-w-3xl">
      <Skeleton className="h-9 w-44" />
      <Skeleton className="mt-3 mb-8 h-4 w-64 max-w-full" />
      <Skeleton className="mb-3 h-4 w-24" />
      <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-4 border-b border-border-base px-5 py-4 last:border-0"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-4 w-1/3" />
            </div>
            <Skeleton className="h-10 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </Busy>
  );
}
