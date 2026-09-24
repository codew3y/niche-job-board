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
  '/',
  '/jobs',
  '/talent',
  '/login',
  '/signup',
  '/verify',
  '/reset-password',
  // Linked from Google's OAuth consent screen, which is shown to people who are BY DEFINITION
  // not signed in yet. Bouncing those links to /login would make the consent screen point at
  // a wall, and a privacy policy you must authenticate to read is not a published one.
  '/privacy',
  '/terms',
  /**
   * Crawler-facing and must never redirect. A crawler that asks for /robots.txt and is handed
   * a 307 to /login learns nothing about what it may crawl, and a sitemap behind a redirect
   * indexes zero pages.
   *
   * Added after exactly that happened — the same omission as /privacy and /terms a day
   * earlier, which is why e2e/public-routes.spec.ts now derives its list from this array
   * rather than keeping a second copy to forget.
   */
  '/robots.txt',
  '/sitemap.xml',
  '/auth/callback',
  '/auth/confirm',
  // Must be public, and must stay public: the keep-alive pings it, and a redirect here
  // would look like a healthy 200 while never touching the database.
  '/api/health',
  /**
   * Scheduled, not public: it authenticates with MATCH_WARM_SECRET and refuses everything
   * without it. Listed here so the session middleware does not redirect a machine caller to
   * the login page — a redirect would turn a failed warm into a cheerful 200 from an HTML
   * page, which is exactly the trap /api/health is public to avoid.
   */
  '/api/match/warm',
];

/** Reachable before the role profile exists — onboarding must be here, see above. */
const PRE_ROLE_PREFIXES = [
  '/select-role',
  '/onboarding',
  '/auth',
  '/logout',
  '/dashboard/settings/roles',
];

/** Exported so tests assert against the real list rather than a copy that drifts. */
export const PUBLIC_ROUTES = PUBLIC_PREFIXES;

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
  // Public paths are public for EVERYONE, signed in or not. Checking this only for
  // signed-out visitors meant a user mid-onboarding was redirected away from /jobs, /talent
  // and /api/health — browsing is not a privilege you earn by finishing a wizard, and the
  // keep-alive ping has no session at all.
  if (isPublic(path)) {
    // The one exception: someone fully onboarded has no reason to sit on the auth screens.
    if (session.signedIn && session.hasRole && (path === '/login' || path === '/signup')) {
      return dashboard(session.activeRole);
    }
    return null;
  }

  if (!session.signedIn) {
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

  return null;
}
