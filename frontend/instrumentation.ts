import type { Instrumentation } from 'next';

/**
 * Server-side error tracking (backend/src/observability/sentry-options.ts). Off without SENTRY_DSN: the
 * SDK is only imported, and errors only reported, when a DSN is set.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  const Sentry = await import('@sentry/nextjs');
  const { sentryOptions } = await import('@techselect/backend/observability/sentry-options');
  Sentry.init(sentryOptions(dsn));
}

/** Errors thrown while rendering or in route handlers and server actions. */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureRequestError(...args);
};
