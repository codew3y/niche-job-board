import 'server-only';

import { createClient } from '../supabase/server';
import type { Viewer } from '../supabase/session';
import { unreadCount } from './messaging';

export type ShellUser = {
  displayName: string;
  activeRole: Viewer['activeRole'];
  hasTalent: boolean;
  hasClient: boolean;
  avatarUrl: string | null;
  /** Unread messages across every thread, both roles. */
  unread: number;
  /** "View profile" — how the active role appears to others. */
  profileHref: string;
  /** "Edit profile" — where the active role's profile is edited. */
  editProfileHref: string;
};

/**
 * Everything the app chrome needs, from the one viewer record. The role is `viewer.activeRole`
 * — never re-derived here.
 */
export async function loadShellUser(viewer: Viewer): Promise<ShellUser> {
  let profileHref = '/dashboard/client/profile#preview';
  let editProfileHref = '/dashboard/client/profile#edit';

  if (viewer.activeRole === 'talent') {
    editProfileHref = '/dashboard/talent/profile';
    const supabase = await createClient();
    const { data } = await supabase
      .from('talent_profiles')
      .select('slug')
      .eq('user_id', viewer.userId)
      .maybeSingle();
    // The owner can read their own draft at its public URL (with a draft banner), so this link
    // works whether or not the profile is published.
    profileHref = data?.slug ? `/talent/${data.slug}` : editProfileHref;
  }

  return {
    displayName: viewer.displayName,
    activeRole: viewer.activeRole,
    hasTalent: viewer.hasTalent,
    hasClient: viewer.hasClient,
    avatarUrl: viewer.avatarUrl,
    unread: await unreadCount(viewer.userId),
    profileHref,
    editProfileHref,
  };
}
