'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '../supabase/server';

const PROVIDERS = { github: 'github', linkedin: 'linkedin_oidc' } as const;

/**
 * Disconnect a linked GitHub or LinkedIn account, then refresh the profile's public copy.
 *
 * Connecting happens in the browser (supabase.auth.linkIdentity, an OAuth round trip that ends
 * at /auth/callback); disconnecting is a server action. Supabase refuses to unlink a user's
 * last identity, and the UI does not offer it, so an account can never lose its only way in.
 *
 * Posted by a submit button with `formAction`, inside the profile or onboarding form, so the
 * result comes back as a redirect to the same page with a status in the query string.
 */
export async function disconnectAccount(formData: FormData): Promise<void> {
  const which = String(formData.get('provider') ?? '');
  const back = String(formData.get('returnTo') ?? '/dashboard/talent/profile');
  const target =
    back.startsWith('/') && !back.startsWith('//') ? back : '/dashboard/talent/profile';
  if (!(which in PROVIDERS)) redirect(target);
  const provider = PROVIDERS[which as keyof typeof PROVIDERS];

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUserIdentities();
  const identity = data?.identities.find((i) => i.provider === provider);
  if (error || !identity) redirect(target);
  if ((data?.identities.length ?? 0) <= 1) {
    redirect(
      withParam(target, 'connect_error', 'This is how you sign in, so it cannot be disconnected.'),
    );
  }

  const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
  if (unlinkError) {
    redirect(withParam(target, 'connect_error', 'Could not disconnect that account. Try again.'));
  }

  await supabase.rpc('sync_connected_accounts');
  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/talent/[slug]', 'page');
  redirect(target);
}

function withParam(path: string, key: string, value: string) {
  const url = new URL(path, 'http://x');
  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}
