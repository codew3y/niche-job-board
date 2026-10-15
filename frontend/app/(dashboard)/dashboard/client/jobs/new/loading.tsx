import { Skeleton } from '@/components/shared/skeleton';

/**
 * Leaf route, no notFound() beneath it: safe to stream (see dashboard/talent/loading.tsx).
 *
 * The shape of JobForm: the page title, then one panel of ruled sections (a heading and its
 * fields each), then the sticky action bar.
 */
export default function Loading() {
  const sections = [
    ['w-24', ['h-11', 'h-44', 'h-24']],
    ['w-16', ['h-11']],
    ['w-20', ['h-10', 'h-11']],
    ['w-40', ['h-10', 'h-11']],
  ] as const;

  return (
    <div role="status" aria-busy="true" aria-label="Loading the job form" className="max-w-3xl">
      <Skeleton className="h-9 w-48" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />

      <div className="mt-8 divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
        {sections.map(([heading, fields], i) => (
          <div key={i} className="px-5 py-6 sm:px-6">
            <Skeleton className={`h-5 ${heading}`} />
            <div className="mt-5 space-y-6">
              {fields.map((h, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className={`${h} w-full rounded-md`} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2 rounded-lg border border-border-base bg-surface-raised p-3">
        <Skeleton className="h-11 w-28 rounded-md" />
        <Skeleton className="h-11 w-24 rounded-md" />
      </div>
    </div>
  );
}
