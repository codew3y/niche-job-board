import { FormSkeleton } from '@/components/shared/skeleton';

/** Leaf route, no notFound() beneath it — safe to stream (see dashboard/talent/loading.tsx). */
export default function Loading() {
  return <FormSkeleton label="Loading the job form" fields={6} />;
}
