/**
 * Error tracking (Sentry), shared by the server and browser set-up.
 *
 * Off unless a DSN is configured: SENTRY_DSN (server) and NEXT_PUBLIC_SENTRY_DSN (browser). With
 * neither set, nothing is initialised and nothing is sent.
 *
 * What a report may contain is kept to what fixing a bug needs: the error and its stack, the
 * page path, the browser. `sendDefaultPii: false`, and `scrub` removes cookies, headers, request
 * bodies, query strings and any user identity before anything leaves, so no email address,
 * session, message or form contents is ever sent. No performance tracing and no session replay:
 * errors only.
 */
type Event = {
  request?: {
    url?: string;
    cookies?: unknown;
    headers?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  user?: unknown;
  breadcrumbs?: { data?: Record<string, unknown> }[];
};

const stripQuery = (url: string) => url.split('?')[0]!.split('#')[0]!;

export function scrub<T extends Event>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url);
  }
  delete event.user;
  for (const crumb of event.breadcrumbs ?? []) {
    for (const key of ['url', 'to', 'from'] as const) {
      const value = crumb.data?.[key];
      if (typeof value === 'string') crumb.data![key] = stripQuery(value);
    }
  }
  return event;
}

export const sentryOptions = (dsn: string) => ({
  dsn,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  beforeSend: scrub,
});
