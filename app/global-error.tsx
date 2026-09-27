'use client';

import { ErrorState } from '@/components/ui/error-state';
import './globals.css';

/**
 * The last line: an error thrown in the ROOT layout itself. It replaces the whole document, so
 * it must render its own <html> and bring the stylesheet — nothing above it survived.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <main id="main" className="gutter">
          <ErrorState error={error} reset={reset} />
        </main>
      </body>
    </html>
  );
}
