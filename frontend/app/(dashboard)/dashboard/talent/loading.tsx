import { Busy, Skeleton } from '@/components/shared/skeleton';

/**
 * Loading state for the developer's dashboard: the greeting, the four stat tiles, then the
 * matches panel beside the profile panel and shortcuts (stacked below lg), in the shape the
 * page will take so nothing shifts when it lands.
 *
 * WHY HERE AND NOT HIGHER. A `loading.tsx` makes its whole subtree stream: the 200 status is
 * sent with this skeleton, before the page runs, so a `notFound()` further down can no longer
 * change the status, and a missing page answers "200, here is a 404 page". Crawlers call that a
 * soft 404, and frontend/e2e/flows.spec.ts rightly fails on it. This subtree has no notFound() anywhere,
 * so a skeleton is safe here. The client side, messages and the public detail pages each have a
 * notFound() below any group-level boundary, so they stream inside the page instead, after the
 * existence check. The sub-pages (matches, applications, saved, profile)
 * each have their own loading.tsx with their own shape.
 */
export default function Loading() {
  return (
    <Busy label="Loading your dashboard">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-32 rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Each tile is the rendered Stat height: 106px on a phone, 112px from sm (measured). */}
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[6.625rem] rounded-lg sm:h-28" />
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <div className="overflow-hidden rounded-lg border border-border-base bg-surface-raised">
          <div className="border-b border-border-base px-5 py-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          </div>
          {Array.from({ length: 3 }, (_, i) => (
            <div
              key={i}
              className="space-y-2.5 border-b border-border-base px-5 py-5 last:border-0"
            >
              <div className="flex justify-between gap-4">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-7 w-16" />
              </div>
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="mt-3 h-10 w-full" />
            </div>
          ))}
        </div>

        <div className="space-y-8">
          <div className="rounded-lg border border-border-base bg-surface-raised p-5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-6 w-12" />
            </div>
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-4/5" />
              ))}
            </div>
            <Skeleton className="mt-5 h-11 w-full rounded-md" />
          </div>
          <div className="divide-y divide-border-base border-y border-border-base">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-1.5 px-1 py-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-44" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Busy>
  );
}
