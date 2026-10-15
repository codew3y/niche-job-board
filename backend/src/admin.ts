import 'server-only';

import { notFound } from 'next/navigation';

import { serverEnv } from './env';
import { getSessionUser } from './supabase/session';

/**
 * Admins: the people listed in ADMIN_EMAILS (comma-separated, case-insensitive). The check uses
 * the signed-in user's verified auth email, not anything they can type into their profile.
 */
export function adminEmails(): Set<string> {
  return new Set(
    (serverEnv().ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

export async function isAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return Boolean(user?.email && adminEmails().has(user.email.toLowerCase()));
}

/**
 * For admin pages and actions. Anyone else gets a 404, not a 403: a 403 confirms the page
 * exists and that it is worth trying to get into.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}
