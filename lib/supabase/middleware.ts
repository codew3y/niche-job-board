import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { clientEnv } from '../env';
import { decideRoute, type Session } from './route-policy';

/**
 * Session refresh + route protection (Phase 2 §6).
 *
 * Two jobs, and the order matters:
 *
 *  1. **Refresh the session.** Supabase access tokens are short-lived. Server Components
 *     cannot write cookies, so without a refresh here a user is silently signed out mid-visit.
 *     `getUser()` — not `getSession()` — because only `getUser()` revalidates the token with
 *     the auth server; `getSession()` trusts whatever the cookie claims, which is forgeable.
 *
 *  2. **Gate routes.** Unauthenticated → / (the landing page is the login). No role yet →
 *     /select-role. Onboarding incomplete → resume at the saved step.
 *
 * This is a convenience layer, NOT the authorization boundary. Middleware can be bypassed and
 * it never sees the data. RLS is what actually protects rows (lib/db/schema/*), and every
 * server action re-checks ownership regardless of what middleware decided.
 *
 * ROUTING DECISIONS COME FROM `decideRoute`, and this file must never reimplement them.
 *
 * It used to. There were two copies of the public-route list — one here, one in
 * route-policy.ts — and they drifted: /privacy and /terms were added to the tested copy and
 * not to this one, so production redirected both to /login for eighteen hours. Every test
 * passed, because the tests exercised decideRoute and the middleware ran its own parallel
 * implementation. A test that does not exercise the live path is a test that agrees with
 * itself.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  /**
   * Cookies and headers from a token refresh, kept so a REDIRECT can carry them too.
   *
   * This was a real session-loss bug. `getUser()` below may rotate the refresh token and write
   * the new pair onto `response` — but a redirect used to be a brand-new NextResponse, so the
   * rotated cookies were dropped and the browser kept the old refresh token. With rotation on
   * (supabase/config.toml), that token is dead after the 10-second reuse window, and the next
   * request signs the user out. It bit exactly when someone reopened the browser after the
   * access token had expired and landed on a page that redirects — which, now that `/` sends
   * signed-in visitors to their dashboard, is every return visit.
   */
  // A holder object rather than a `let`: TypeScript cannot see the write inside the cookie
  // callback, and would narrow a plain variable to `null` for good.
  const refreshed: {
    current: {
      cookies: { name: string; value: string; options: CookieOptions }[];
      headers: Record<string, string>;
    } | null;
  } = { current: null };

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet, headers) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // no-store on any response that sets auth cookies, so a CDN can never serve one
          // visitor's session to another (@supabase/ssr passes these for exactly that).
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
          refreshed.current = { cookies: cookiesToSet, headers };
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  /**
   * One read for the whole decision. `user_profiles` is the source rather than user metadata:
   * metadata is client-writable, so a user could hand themselves a role by editing it.
   *
   * Skipped entirely when signed out — there is no profile to read, and a query per anonymous
   * request is a cost for nothing.
   */
  let session: Session = { signedIn: false, hasChosen: false, hasRole: false, activeRole: null };

  if (user) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('active_role, has_talent, has_client')
      .eq('user_id', user.id)
      .maybeSingle();

    session = {
      signedIn: true,
      // A user_profiles row means a role was chosen and onboarding is under way, even though
      // the role profile it creates does not exist yet.
      hasChosen: Boolean(profile),
      hasRole: Boolean(profile?.has_talent || profile?.has_client),
      activeRole: (profile?.active_role as 'talent' | 'client' | null) ?? null,
    };
  }

  const target = decideRoute(path, session);
  if (!target) return response;

  const url = request.nextUrl.clone();
  const [pathname, query] = target.split('?');
  url.pathname = pathname!;
  // decideRoute builds its own query string (the ?next= on /login), so anything already on
  // the URL is replaced rather than merged — carrying a stale query onto a redirect target is
  // how a filtered list ends up on a dashboard.
  url.search = query ? `?${query}` : '';
  const redirect = NextResponse.redirect(url);
  // See `refreshed` above: without this, a redirect silently discards a token rotation.
  const carried = refreshed.current;
  if (carried) {
    for (const { name, value, options } of carried.cookies) {
      redirect.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(carried.headers)) redirect.headers.set(key, value);
  }
  return redirect;
}
