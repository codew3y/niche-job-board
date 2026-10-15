import { Busy, Skeleton } from '@/components/shared/skeleton';

/** Edit profile: the header, the publish panel, then the Details form (label + control pairs). */
export default function Loading() {
  return (
    <Busy label="Loading your profile" className="max-w-3xl xl:ml-50">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 mb-8 h-4 w-72 max-w-full" />
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border-base bg-surface-raised p-5 sm:p-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <Skeleton className="h-11 w-28 rounded-md" />
      </div>
      <div className="mt-10 space-y-6">
        <div>
          <Skeleton className="h-6 w-24" />
          <Skeleton className="mt-2 h-4 w-64 max-w-full" />
        </div>
        {['h-11', 'h-11', 'h-44', 'h-11'].map((h, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className={`${h} w-full rounded-md`} />
          </div>
        ))}
      </div>
    </Busy>
  );
}
