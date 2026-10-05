/**
 * Report an error that an error boundary caught (so the browser never saw it as unhandled).
 * A no-op without NEXT_PUBLIC_SENTRY_DSN, and the SDK chunk loads only when it is set.
 */
export function reportError(error: unknown) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  void import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error));
}
