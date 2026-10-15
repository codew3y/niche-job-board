'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@techselect/backend/supabase/server';
import type { ActionResult } from './auth';

/**
 * Change the name shown in the profile menu, on messages a developer sends, and in emails and
 * notifications about them. Until now it was set once at signup and could never change.
 * RLS: user_profiles_update_self.
 */
export async function updateDisplayName(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get('displayName') ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (name.length < 2) {
    return {
      ok: false,
      message: 'Check the field below.',
      fields: { displayName: ['At least 2 characters.'] },
    };
  }
  if (name.length > 80) {
    return {
      ok: false,
      message: 'Check the field below.',
      fields: { displayName: ['80 characters at most.'] },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('user_profiles')
    .update({ display_name: name })
    .eq('user_id', user.id);
  if (error) return { ok: false, message: 'Could not save your name. Try again.' };

  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}
