'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '../supabase/server';

/**
 * Mark all of the signed-in person's notifications read. Called from the notifications page in
 * the browser once it is on screen, never on render (prefetch renders pages nobody looked at).
 * RLS: notifications_update_own.
 */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null);
  revalidatePath('/dashboard', 'layout');
}
