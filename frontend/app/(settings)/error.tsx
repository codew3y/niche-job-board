'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function SettingsError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorState {...props} home="/dashboard/settings" />;
}
