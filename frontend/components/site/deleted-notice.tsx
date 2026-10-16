'use client';

import { CheckCircle } from '@phosphor-icons/react';
import { useSearchParams } from 'next/navigation';

import { CONTAINER } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * Where a deleted account lands (`/?deleted=1`). Signing someone out with no acknowledgement
 * reads as a failure, not a completion.
 *
 * Read in the browser: reading the query string on the server would make the home page render
 * per request, and it is otherwise the same for everyone. Render inside <Suspense>.
 */
export function DeletedNotice() {
  if (useSearchParams().get('deleted') !== '1') return null;
  return (
    <div className={cn(CONTAINER, 'pt-6')}>
      <p
        role="status"
        className="flex items-start gap-3 rounded-lg bg-success-subtle px-5 py-4 text-sm text-text-muted"
      >
        <CheckCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
        <span>
          <strong className="font-semibold text-text">Your account has been deleted.</strong>{' '}
          Anything you posted is gone. Conversations you were part of stay, with your side removed,
          as the privacy policy sets out.
        </span>
      </p>
    </div>
  );
}
