/**
 * Role vocabulary shared by the route policy, the server helpers and the UI.
 *
 * Pure — no server-only imports — so the proxy, Server Components and tests can all use it.
 *
 * THE ROLE A PAGE RENDERS FOR IS `user_profiles.active_role`, AND NOTHING ELSE. Not whether a
 * talent or client profile happens to exist. A dual-role account has both, and deciding by
 * existence is exactly how Browse came to show a developer's view while the dashboard showed
 * a client's for the same person. Read it through `getViewer()` (backend/src/supabase/session.ts).
 */
export type Role = 'talent' | 'client';

export const ROLE_NAME: Record<Role, string> = { talent: 'developer', client: 'client' };

export const dashboardPath = (role: Role | null) =>
  role === 'client' ? '/dashboard/client' : '/dashboard/talent';

/**
 * Where the logo goes. Signed in → the app; signed out → the front door. The app's own home is
 * /dashboard, which resolves the active role itself, so the logo never needs to know it.
 */
export const logoHref = (signedIn: boolean) => (signedIn ? '/dashboard' : '/');
