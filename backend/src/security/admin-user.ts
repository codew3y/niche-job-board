/**
 * The admin rule: the address is in ADMIN_EMAILS AND its owner has confirmed it.
 *
 * An address only proves identity once someone has clicked the link sent to it. If email
 * confirmation is ever off in the Supabase project, anyone could sign up as an admin address that
 * nobody has registered yet; checking the address alone would make them an admin.
 */
export function isAdminUser(
  user: { email?: string | null; email_confirmed_at?: string | null } | null,
  admins: Set<string>,
): boolean {
  return Boolean(user?.email && user.email_confirmed_at && admins.has(user.email.toLowerCase()));
}
