import { Busy, Skeleton } from '@/components/shared/skeleton';

/** Applications: the header, then a row per application with its status and timeline. */
export default function Loading() {
  return (
    <Busy label="Loading your applications" className="max-w-3xl">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 mb-8 h-4 w-80 max-w-full" />
      <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border-b border-border-base px-5 py-5 last:border-0">
            <div className="flex justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
            <div className="mt-4 space-y-2.5 border-l border-border-base pl-4">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    </Busy>
  );
}
