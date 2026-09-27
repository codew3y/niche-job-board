'use client';

import { ErrorState } from '@/components/ui/error-state';

export default function MarketingError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="gutter flex-1">
      <ErrorState {...props} />
    </div>
  );
}
