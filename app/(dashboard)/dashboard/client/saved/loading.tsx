import { Skeleton } from '@/components/shared/skeleton';

/**
 * Loading state for saved developers: a leaf route with no notFound() beneath it.
 *
 * WHY HERE AND NOT HIGHER. A `loading.tsx` makes its whole subtree stream: the 200 status is
 * sent with this skeleton, before the page runs — so a `notFound()` further down can no longer
 * change the status, and a missing page answers "200, here is a 404 page". Crawlers call that a
 * soft 404, and e2e/flows.spec.ts rightly fails on it. This subtree has no notFound() anywhere,
 * so a skeleton is safe here. The client side, messages and the public detail pages each have a
 * notFound() below any group-level boundary, so they stream inside the page instead, after the
 * existence check.
 */
export default function Loading() {
  // The shape of the saved list: title, then rows of avatar, headline, facts and the toggle.
  return (
    <div role="status" aria-busy="true" aria-label="Loading saved developers" className="max-w-3xl">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="mt-3 h-4 w-56 max-w-full" />
      <div className="mt-8 divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              <Skeleton className="hidden size-10 shrink-0 rounded-md sm:block" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3.5 w-2/5" />
              </div>
            </div>
            <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
