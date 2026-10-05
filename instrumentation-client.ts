/**
 * Browser error tracking (lib/observability/sentry-options.ts). The SDK is loaded only when
 * NEXT_PUBLIC_SENTRY_DSN is set, as a separate chunk after the page is up, so a site without
 * error tracking ships none of it and the first paint never waits for it.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  void Promise.all([import('@sentry/nextjs'), import('./lib/observability/sentry-options')]).then(
    ([Sentry, { sentryOptions }]) => Sentry.init(sentryOptions(dsn)),
  );
}
