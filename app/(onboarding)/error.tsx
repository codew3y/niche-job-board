'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function OnboardingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="gutter">
      <ErrorState {...props} />
    </div>
  );
}
