import 'server-only';

import type { NotificationRow } from '../notifications/describe';
import { createClient } from '../supabase/server';

/** The signed-in person's notifications, newest first. RLS: notifications_select_own. */
export async function listNotifications(limit = 50): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('notifications')
    .select('id, type, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}

/** For the nav badge. */
export async function unreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);
  return count ?? 0;
}
