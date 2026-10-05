import 'server-only';

import { createClient } from '../supabase/server';
import { getClientProfileId, type Viewer } from '../supabase/session';
import { unreadCount } from './messaging';
import { unreadNotificationCount } from './notifications';
import { isAdmin } from '../admin';

export type ShellUser = {
  displayName: string;
  activeRole: Viewer['activeRole'];
  hasTalent: boolean;
  hasClient: boolean;
  avatarUrl: string | null;
  /** Unread messages across every thread, both roles. */
  unread: number;
  /** Unread in-app notifications, for the bell. */
  notificationsUnread: number;
  /** In ADMIN_EMAILS: the profile menu shows the reports queue. */
  isAdmin: boolean;
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
  let profileHref = '/dashboard/client/profile';
  let editProfileHref = '/dashboard/client/profile';

  if (viewer.activeRole === 'client') {
    // The public company page. Without a company row yet, both items collapse into one
    // (account-menu shows a single "Company profile" when the two hrefs match).
    const clientId = await getClientProfileId();
    if (clientId) profileHref = `/company/${clientId}`;
  } else {
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
    notificationsUnread: await unreadNotificationCount(viewer.userId),
    isAdmin: await isAdmin(),
    profileHref,
    editProfileHref,
  };
}
