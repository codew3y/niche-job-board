import { describe, expect, it } from 'vitest';

import { scrub, sentryOptions } from './sentry-options';

describe('error reports carry no personal data', () => {
  it('drops cookies, headers, bodies, query strings and the user', () => {
    const event = scrub({
      request: {
        url: 'https://techselect.vercel.app/dashboard/messages/abc?token=secret#x',
        cookies: { 'sb-access-token': 'secret' },
        headers: { authorization: 'Bearer secret' },
        data: { body: 'a private message' },
        query_string: 'token=secret',
      },
      user: { email: 'maria@example.com', ip_address: '1.2.3.4' },
      breadcrumbs: [{ data: { url: '/jobs/x?ref=email', to: '/browse?q=react', from: '/' } }],
    });
    expect(event.request).toEqual({ url: 'https://techselect.vercel.app/dashboard/messages/abc' });
    expect(event).not.toHaveProperty('user');
    expect(event.breadcrumbs![0]!.data).toEqual({ url: '/jobs/x', to: '/browse', from: '/' });
    expect(JSON.stringify(event)).not.toMatch(/secret|maria|private message|1\.2\.3\.4/);
  });

  it('sends errors only: no default PII, no tracing', () => {
    const options = sentryOptions('https://key@o0.ingest.sentry.io/0');
    expect(options.sendDefaultPii).toBe(false);
    expect(options.tracesSampleRate).toBe(0);
    expect(options.beforeSend).toBe(scrub);
  });
});
