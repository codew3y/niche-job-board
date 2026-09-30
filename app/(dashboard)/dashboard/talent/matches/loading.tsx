import { Busy, Skeleton } from '@/components/shared/skeleton';

/** Matches: the header, then the ruled list of match rows (title + score, facts, reason). */
export default function Loading() {
  return (
    <Busy label="Loading your matches" className="max-w-3xl">
      <Skeleton className="h-9 w-40" />
      <Skeleton className="mt-3 mb-8 h-4 w-96 max-w-full" />
      <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="space-y-2.5 border-b border-border-base px-5 py-5 last:border-0">
            <div className="flex justify-between gap-4">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-7 w-16" />
            </div>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-3 h-12 w-full" />
          </div>
        ))}
      </div>
    </Busy>
  );
}
