import { FormSkeleton } from '@/components/shared/skeleton';

export default function Loading() {
  return <FormSkeleton label="Loading settings" fields={3} />;
}
