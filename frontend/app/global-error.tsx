'use client';

import { ErrorState } from '@/components/ui/error-state';
import './globals.css';

/**
 * The last line: an error thrown in the ROOT layout itself. It replaces the whole document, so
 * it must render its own <html> and bring the stylesheet; nothing above it survived.
 *
 * What does NOT survive: the root layout's next/font variables (so text falls back to the
 * system sans, by design of the token stack) and next-themes' `data-theme` attribute (so the
 * palette follows the OS through the `prefers-color-scheme` copy of the dark tokens). The body
 * sets its own surface and text colours, so the page is legible even if the base layer of the
 * stylesheet were to arrive late.
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
      <body className="min-h-dvh bg-surface font-sans text-text antialiased">
        <main id="main" className="gutter flex min-h-dvh flex-col justify-center">
          <ErrorState error={error} reset={reset} />
        </main>
      </body>
    </html>
  );
}
