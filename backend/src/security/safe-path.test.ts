import { describe, expect, it } from 'vitest';

import { safePath } from './safe-path';

describe('safePath', () => {
  it('accepts a path on this site, query string and all', () => {
    expect(safePath('/dashboard')).toBe('/dashboard');
    expect(safePath('/jobs/sync-hubspot?ref=email#apply')).toBe(
      '/jobs/sync-hubspot?ref=email#apply',
    );
  });

  it.each([
    ['an absolute URL', 'https://evil.com'],
    ['a protocol-relative URL', '//evil.com'],
    ['a backslash, which browsers read as a slash', '/\\evil.com'],
    ['an encoded-looking backslash after decoding', '/\\/evil.com'],
    ['a tab inside the double slash', '/\t/evil.com'],
    ['a newline', '/\n/evil.com'],
    ['a relative path', 'dashboard'],
    ['a javascript: URL', 'javascript:alert(1)'],
    ['an empty string', ''],
  ])('refuses %s', (_, value) => {
    expect(safePath(value)).toBeNull();
  });

  it('refuses anything that is not a string', () => {
    expect(safePath(null)).toBeNull();
    expect(safePath(undefined)).toBeNull();
    expect(safePath(new File([], 'x'))).toBeNull();
  });
});
