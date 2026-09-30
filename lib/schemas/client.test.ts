import { describe, expect, it } from 'vitest';

import { clientProfileInput } from './client';

/**
 * The company form posts strings, and blank optional fields post "". These tests are the form's
 * actual payload, not its ideal one.
 *
 * `companySize` was removed from the form, the schema and the table (migration 0020).
 */
const post = (over: Record<string, unknown> = {}) => ({
  companyName: 'Acme',
  website: '',
  industry: '',
  about: '',
  ...over,
});

describe('clientProfileInput', () => {
  it('accepts a form where nothing optional was filled in', () => {
    const r = clientProfileInput.safeParse(post());
    expect(r.success).toBe(true);
  });

  it('stores blank optional fields as null rather than empty strings', () => {
    const r = clientProfileInput.parse(post());
    expect(r.website).toBeNull();
    expect(r.industry).toBeNull();
  });

  it('no longer knows about company size — a stale field is dropped, not stored', () => {
    const r = clientProfileInput.parse(post({ companySize: '11-50' }));
    expect(r).not.toHaveProperty('companySize');
  });

  it('still requires a company name — it is on every job this client posts', () => {
    const r = clientProfileInput.safeParse(post({ companyName: 'A' }));
    expect(r.success).toBe(false);
  });

  it('refuses a non-https website, like every other link field', () => {
    expect(clientProfileInput.safeParse(post({ website: 'javascript:alert(1)' })).success).toBe(
      false,
    );
    expect(clientProfileInput.safeParse(post({ website: 'https://acme.dev' })).success).toBe(true);
  });
});
