import { describe, expect, it } from 'vitest';

import { clientProfileInput, companySizes } from './client';

/**
 * The company form posts strings, and a `<select>` with no choice made posts "".
 *
 * `companySize` was `z.enum([...]).optional()`, which rejects "" — so every save from an
 * untouched form failed validation, and since the field had no error slot the page showed
 * nothing at all. The button worked; the save never happened. These tests are the form's
 * actual payload, not its ideal one.
 */
const post = (over: Record<string, unknown> = {}) => ({
  companyName: 'Acme',
  website: '',
  industry: '',
  companySize: '',
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
    expect(r.companySize).toBeNull();
  });

  it('keeps every size the picker offers', () => {
    for (const size of companySizes) {
      expect(clientProfileInput.safeParse(post({ companySize: size })).success).toBe(true);
    }
  });

  it('still rejects a size that is not on the list', () => {
    const r = clientProfileInput.safeParse(post({ companySize: 'enormous' }));
    expect(r.success).toBe(false);
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
