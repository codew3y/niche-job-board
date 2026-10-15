import { describe, expect, it } from 'vitest';

import { confirmationMatches, deleteAccountInput } from './account';

/**
 * The gate on an irreversible action.
 *
 * It must be hard enough that nobody crosses it by accident, and not so literal that a real
 * person who typed their own address correctly is refused. Those pull in opposite directions,
 * and the cases below are where the line sits.
 */
describe('deleteAccountInput', () => {
  it('refuses an empty confirmation', () => {
    expect(deleteAccountInput.safeParse({ confirm: '' }).success).toBe(false);
    expect(deleteAccountInput.safeParse({ confirm: '   ' }).success).toBe(false);
  });

  it('refuses a missing confirmation rather than treating it as blank', () => {
    expect(deleteAccountInput.safeParse({}).success).toBe(false);
    expect(deleteAccountInput.safeParse({ confirm: null }).success).toBe(false);
  });

  it('accepts an address', () => {
    expect(deleteAccountInput.safeParse({ confirm: 'someone@example.com' }).success).toBe(true);
  });
});

describe('confirmationMatches', () => {
  const EMAIL = 'Someone@Example.com';

  it('accepts the address exactly as stored', () => {
    expect(confirmationMatches('Someone@Example.com', EMAIL)).toBe(true);
  });

  it('ignores case — email addresses are not case-sensitive to their owner', () => {
    expect(confirmationMatches('someone@example.com', EMAIL)).toBe(true);
    expect(confirmationMatches('SOMEONE@EXAMPLE.COM', EMAIL)).toBe(true);
  });

  it('ignores surrounding whitespace, which autofill and copy-paste both add', () => {
    expect(confirmationMatches('  someone@example.com  ', EMAIL)).toBe(true);
  });

  it('refuses a DIFFERENT account — the mistake worth preventing on a shared machine', () => {
    expect(confirmationMatches('someone.else@example.com', EMAIL)).toBe(false);
  });

  it('refuses a near miss rather than being generous about it', () => {
    expect(confirmationMatches('someone@example.co', EMAIL)).toBe(false);
    expect(confirmationMatches('someone@exampl.com', EMAIL)).toBe(false);
    expect(confirmationMatches('someone', EMAIL)).toBe(false);
  });

  it('refuses the word DELETE, which is a different product’s gate', () => {
    expect(confirmationMatches('DELETE', EMAIL)).toBe(false);
  });

  it('refuses blank against blank, so a user with no email cannot be deleted by typing nothing', () => {
    expect(confirmationMatches('', '')).toBe(true); // the raw comparison is symmetric…
    // …which is exactly why frontend/lib/actions/account.ts checks `user.email` is present BEFORE
    // calling this. Pinned here so that guard is not removed as redundant.
  });
});
