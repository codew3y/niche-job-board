'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { clientProfileInput } from '@techselect/backend/schemas/client';
import { createClient } from '@techselect/backend/supabase/server';
import type { ActionResult } from './auth';

/**
 * Editing a company profile.
 *
 * This did not exist. A client could set a company name during onboarding and then never
 * change it — no page, no action, nothing. The name is shown on every job post they publish,
 * so a typo made once was permanent, and "Profile" in the navigation had nowhere to point.
 *
 * Ownership is RLS: `client_profiles_write_own` scopes the update to the row whose `user_id`
 * matches. The `.eq('user_id', …)` below is a second expression of the same rule, not the
 * enforcement.
 */
function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function updateClientProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const parsed = clientProfileInput.safeParse({
    companyName: formData.get('companyName'),
    website: formData.get('website'),
    industry: formData.get('industry'),
    about: formData.get('about'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const { error } = await supabase
    .from('client_profiles')
    .update({
      company_name: parsed.data.companyName,
      website: parsed.data.website,
      industry: parsed.data.industry,
      about: parsed.data.about ?? '',
    })
    .eq('user_id', user.id);

  if (error) return { ok: false, message: 'Could not save. Try again.' };

  // The company name appears on every job card and public job page, so those caches are now
  // wrong too.
  revalidatePath('/dashboard/client/profile');
  revalidatePath('/browse');
  return { ok: true };
}
