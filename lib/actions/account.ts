'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { confirmationMatches, deleteAccountInput } from '../schemas/account';
import { createClient, createServiceClient } from '../supabase/server';
import type { ActionResult } from './auth';

/**
 * Deleting an account, from the product rather than from the Supabase dashboard.
 *
 * /privacy has told users since it was published that they can "delete your account from
 * settings at any time". There was no such page, no action and no route — the promise was
 * simply untrue. The database half has always been ready (migrations 0002 and 0008, proved by
 * lib/db/deletion.test.ts); what was missing was any way to ask for it.
 *
 * Two things make this different from every other action here:
 *
 *   1. It needs the SERVICE-ROLE client. `auth.admin.deleteUser` is an admin operation, and
 *      the user's own JWT cannot authorise the removal of the auth row. RLS is not the
 *      boundary here — ownership is, and it is established by `getUser()` returning the very
 *      user whose id is then deleted. No id is ever taken from the form.
 *
 *   2. It cannot be undone and it cannot be partially done. The cascade either removes the
 *      profile, portfolio, uploads, jobs, applications, saved lists and blocks, or it fails
 *      and the account stands. That is enforced in Postgres, not here.
 *
 * Conversations survive by design, with this user's side tombstoned — the exception /privacy
 * states explicitly, because a thread has two owners and destroying it would take the other
 * person's record of an exchange they may still need.
 */
export async function deleteAccount(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = deleteAccountInput.safeParse({ confirm: formData.get('confirm') });
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Type your email address to confirm.',
      fields: { confirm: ['Type your email address to confirm.'] },
    };
  }

  if (!user.email || !confirmationMatches(parsed.data.confirm, user.email)) {
    return {
      ok: false,
      message: 'That is not the email address on this account.',
      fields: { confirm: ['That is not the email address on this account.'] },
    };
  }

  const { error } = await createServiceClient().auth.admin.deleteUser(user.id);
  if (error) {
    // Deliberately not swallowed and not retried. A half-answered erasure request is worse
    // than a refused one, because the person walks away believing it happened.
    console.error(`[account] delete failed for ${user.id}: ${error.message}`);
    return {
      ok: false,
      message: 'Could not delete the account. Nothing was removed — please try again.',
    };
  }

  // The auth row is gone, so the token can no longer be revoked server-side. `scope: 'local'`
  // clears the cookies without asking the auth server about a user that no longer exists.
  await supabase.auth.signOut({ scope: 'local' });
  revalidatePath('/', 'layout');
  redirect('/?deleted=1');
}
