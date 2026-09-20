/**
 * Route gating, as a pure function.
 *
 * Extracted from the middleware so it can be tested. It was not testable before, and the bug
 * it now guards against shipped: `/onboarding` was gated on `has_talent`/`has_client`, which
 * are set by trigger when the role profile is created — BY onboarding. Choosing a role sent
 * you to onboarding, which bounced you back to choosing a role, forever.
 *
 * The three states a signed-in user can be in:
 *   1. no user_profiles row      → has not chosen a role yet
 *   2. row, but no role profile  → mid-onboarding
 *   3. role profile exists       → done, dashboards open
 */

export type Session = {
  signedIn: boolean;
  /** A user_profiles row exists — a role has been chosen. */
  hasChosen: boolean;
  /** has_talent || has_client — a role profile actually exists. */
  hasRole: boolean;
  activeRole: 'talent' | 'client' | null;
};

const PUBLIC_PREFIXES = [
  '/', '/jobs', '/talent', '/login', '/signup', '/verify',
  '/reset-password', '/auth/callback', '/auth/confirm',
];

/** Reachable before the role profile exists — onboarding must be here, see above. */
const PRE_ROLE_PREFIXES = [
  '/select-role', '/onboarding', '/auth', '/logout', '/dashboard/settings/roles',
];

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)) || path === p);

const isPublic = (path: string) =>
  PUBLIC_PREFIXES.some((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)));

const firstStep = (role: 'talent' | 'client' | null) =>
  role === 'client' ? '/onboarding/client/company' : '/onboarding/talent/basics';

/**
 * Dashboards live under /dashboard, NOT at /talent and /client.
 *
 * §5.3 puts public profile browsing at /talent and /talent/[slug]. Route groups do not
 * affect the URL, so a dashboard at /talent would collide with it — two pages resolving to
 * one path. Namespacing the private side keeps the public URLs free for Phase 3.
 */
const dashboard = (role: 'talent' | 'client' | null) =>
  role === 'client' ? '/dashboard/client' : '/dashboard/talent';

/** Where this request should go, or null to let it through. */
export function decideRoute(path: string, session: Session): string | null {
  if (!session.signedIn) {
    if (isPublic(path)) return null;
    return `/login?next=${encodeURIComponent(path)}`;
  }

  if (matches(path, PRE_ROLE_PREFIXES)) {
    if (!session.hasChosen && path.startsWith('/onboarding')) return '/select-role';
    if (session.hasRole && path === '/select-role') return dashboard(session.activeRole);
    return null;
  }

  if (!session.hasRole) {
    // Mid-onboarding resumes where they were; otherwise they still have to choose.
    return session.hasChosen ? firstStep(session.activeRole) : '/select-role';
  }

  if (path === '/login' || path === '/signup') return dashboard(session.activeRole);

  return null;
}
