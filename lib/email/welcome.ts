import 'server-only';

import { createClient, createServiceClient } from '../supabase/server';
import { sendEmailInBackground } from './send';
import { welcomeEmail } from './templates';

/**
 * Send the welcome email exactly once per account.
 *
 * Called from both auth landing routes, because there are two ways to arrive with a session
 * for the first time: /auth/confirm after verifying an email, and /auth/callback after OAuth.
 * Calling it from only one would silently skip whichever cohort used the other.
 *
 * Idempotence is a conditional UPDATE, not a read-then-write. `welcomed_at is null` in the
 * WHERE clause means the database decides the winner: two concurrent requests — a double-
 * clicked link, a retried redirect — produce one row updated and one row not, and only the
 * one that won sends. Checking the column first and then writing would let both pass the
 * check before either wrote.
 *
 * Claim-then-send, in that order. Sending first and marking after would send twice whenever
 * the mark failed, and a duplicate welcome is more annoying than a missing one.
 */
export async function sendWelcomeOnce(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  let service;
  try {
    service = createServiceClient();
  } catch {
    // No service-role key configured. Not a reason to break the auth redirect.
    return;
  }

  const { data: claimed } = await service
    .from('user_profiles')
    .update({ welcomed_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('welcomed_at', null)
    .select('display_name')
    .maybeSingle();

  // Already welcomed, or the profile row does not exist yet. Either way, nothing to send.
  if (!claimed) return;

  sendEmailInBackground(
    welcomeEmail({ to: user.email, displayName: claimed.display_name || 'there' }),
  );
}
