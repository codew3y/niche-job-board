import { Skeleton } from '@/components/shared/skeleton';

/**
 * Settings while it loads: a title, the ruled list of sections, and the appearance choice. The
 * shape of the settings index, which is where almost every visit lands first; the roles and
 * account pages share the same title-then-panels rhythm, so it holds their space too.
 */
export default function Loading() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading settings" className="max-w-3xl">
      <Skeleton className="h-9 w-48 max-w-full" />

      <div className="mt-8 divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Skeleton className="size-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="mt-10 h-5 w-32" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
