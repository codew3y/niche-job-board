import { z } from 'zod';

import { trimmed } from './primitives';

/**
 * Deleting an account.
 *
 * The confirmation is the account's OWN email address, typed out, rather than a password.
 * Google and GitHub accounts have no password to re-enter, so a password gate would make the
 * deletion promise in /privacy true for some users and false for others — which is the exact
 * failure this whole feature exists to correct.
 *
 * Typing your own address is also a better-targeted check than typing "DELETE": it proves you
 * know which account you are on, which is the mistake worth preventing for someone signed in
 * on a shared machine.
 */
export const deleteAccountInput = z.object({
  confirm: trimmed.min(1, 'Type your email address to confirm.').max(320),
});

/** Case and surrounding whitespace do not make it a different address. */
export function confirmationMatches(typed: string, email: string): boolean {
  return typed.trim().toLowerCase() === email.trim().toLowerCase();
}

export type DeleteAccountInput = z.infer<typeof deleteAccountInput>;
