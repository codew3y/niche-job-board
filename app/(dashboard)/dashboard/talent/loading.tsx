import { PageSkeleton } from '@/components/shared/skeleton';

/**
 * Loading state for the developer's dashboard and everything under it.
 *
 * WHY HERE AND NOT HIGHER. A `loading.tsx` makes its whole subtree stream: the 200 status is
 * sent with this skeleton, before the page runs — so a `notFound()` further down can no longer
 * change the status, and a missing page answers "200, here is a 404 page". Crawlers call that a
 * soft 404, and e2e/flows.spec.ts rightly fails on it. This subtree has no notFound() anywhere,
 * so a skeleton is safe here. The client side, messages and the public detail pages each have a
 * notFound() below any group-level boundary, so they stream inside the page instead, after the
 * existence check (DESIGN.md §9, J6).
 */
export default function Loading() {
  return <PageSkeleton label="Loading your dashboard" stats />;
}
