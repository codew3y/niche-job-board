import { describe, expect, it } from 'vitest';

import { hasBearer, timingSafeEqual } from './bearer';

const SECRET = 'operator-secret-0123456789';
const req = (authorization?: string) =>
  new Request('https://example.test/api/health', {
    headers: authorization ? { authorization } : {},
  });

describe('hasBearer', () => {
  it('accepts the configured secret', () => {
    expect(hasBearer(req(`Bearer ${SECRET}`), SECRET)).toBe(true);
    expect(hasBearer(req(`bearer ${SECRET}`), SECRET)).toBe(true);
  });

  it('refuses a wrong, partial or missing secret', () => {
    expect(hasBearer(req('Bearer nope'), SECRET)).toBe(false);
    expect(hasBearer(req(`Bearer ${SECRET.slice(0, -1)}`), SECRET)).toBe(false);
    expect(hasBearer(req(), SECRET)).toBe(false);
  });

  it('never matches when no secret is configured, even an empty header', () => {
    expect(hasBearer(req('Bearer '), undefined)).toBe(false);
    expect(hasBearer(req(), '')).toBe(false);
  });
});

describe('timingSafeEqual', () => {
  it('compares by value', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });
});
