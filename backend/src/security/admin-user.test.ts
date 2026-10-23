import { describe, expect, it } from 'vitest';

import { isAdminUser } from './admin-user';

const ADMINS = new Set(['owner@example.test']);
const confirmed = '2026-10-01T00:00:00Z';

describe('isAdminUser', () => {
  it('accepts a listed address that has been confirmed, in any case', () => {
    expect(
      isAdminUser({ email: 'Owner@Example.test', email_confirmed_at: confirmed }, ADMINS),
    ).toBe(true);
  });

  it('REFUSES a listed address that was never confirmed', () => {
    expect(isAdminUser({ email: 'owner@example.test', email_confirmed_at: null }, ADMINS)).toBe(
      false,
    );
    expect(isAdminUser({ email: 'owner@example.test' }, ADMINS)).toBe(false);
  });

  it('refuses an address that is not listed, and nobody signed in', () => {
    expect(
      isAdminUser({ email: 'someone@example.test', email_confirmed_at: confirmed }, ADMINS),
    ).toBe(false);
    expect(isAdminUser(null, ADMINS)).toBe(false);
  });
});
