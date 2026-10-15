import 'server-only';

import { createServiceClient } from '../supabase/server';
import type { NotificationType } from './describe';

/**
 * Write an in-app notification for someone else.
 *
 * The service role, because `notifications` has no insert policy: a user can read and mark their
 * own, but nobody can create one for another person through the API. Callers run this only AFTER
 * their own RLS-checked write succeeded (the application, the status change, the message), which
 * is what proves the event happened and the caller was entitled to cause it.
 *
 * `dedupeKey` is unique per user. Writing the same key again brings that notification back to the
 * top as unread with the newest payload, instead of adding a row: one entry per conversation, not
 * one per message. Never throws; a missing notification must not fail the action that caused it.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  payload: Record<string, string | null>,
  dedupeKey: string,
): Promise<void> {
  try {
    const { error } = await createServiceClient().from('notifications').upsert(
      {
        user_id: userId,
        type,
        payload,
        dedupe_key: dedupeKey,
        read_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,dedupe_key' },
    );
    if (error) console.warn(`[notify] ${type}: ${error.message}`);
  } catch (cause) {
    console.warn(`[notify] ${type}: ${String(cause).slice(0, 200)}`);
  }
}
