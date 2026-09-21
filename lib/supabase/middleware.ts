import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { clientEnv } from '../env';

/** Routes a signed-out visitor may reach. Everything else redirects to /login. */
const PUBLIC_PREFIXES = [
  '/',
  '/jobs',
  '/talent',
  '/login',
  '/signup',
  '/verify',
  '/reset-password',
  '/auth/callback',
  '/auth/confirm',
];

/**
 * Routes a signed-in user may reach before they have a completed role profile.
 *
 * `/onboarding` MUST be here. `has_talent` / `has_client` are set by trigger when the
 * talent_profiles or client_profiles row is created — and that row is created BY onboarding.
 * Gating onboarding on the flags it exists to produce is a redirect loop: choose a role,
 * get sent to onboarding, get bounced back to choose a role.
 */
const PRE_ROLE_PREFIXES = [
  '/select-role',
  '/onboarding',
  '/auth',
  '/logout',
  '/dashboard/settings/roles',
];

const isPublic = (path: string) =>
  PUBLIC_PREFIXES.some((p) => path === p || (p !== '/' && path.startsWith(`${p}/`)));

const matches = (path: string, prefixes: string[]) =>
  prefixes.some((p) => path === p || path.startsWith(`${p}/`));

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
 *  2. **Gate routes.** Unauthenticated → /login. No role yet → /select-role. Onboarding
 *     incomplete → resume at the saved step.
 *
 * This is a convenience layer, NOT the authorization boundary. Middleware can be bypassed and
 * it never sees the data. RLS is what actually protects rows (lib/db/schema/*), and every
 * server action re-checks ownership regardless of what middleware decided.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // ── signed out ──
  if (!user) {
    if (isPublic(path)) return response;
    const login = request.nextUrl.clone();
    login.pathname = '/login';
    // Preserve where they were headed so sign-in can return them there. Only the path, never
    // an absolute URL — accepting one would make this an open redirect.
    login.searchParams.set('next', path);
    return NextResponse.redirect(login);
  }

  // ── signed in, but has not chosen a role ──
  // Read from user_profiles rather than user metadata: metadata is client-writable, and a
  // user could hand themselves a role by editing it.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('active_role, has_talent, has_client')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasRole = Boolean(profile?.has_talent || profile?.has_client);
  // A user_profiles row means they picked a role and onboarding is under way, even though
  // the role profile it creates does not exist yet.
  const hasChosen = Boolean(profile);

  if (matches(path, PRE_ROLE_PREFIXES)) {
    // Nothing chosen yet, but deep-linked into onboarding — send them to choose first.
    if (!hasChosen && path.startsWith('/onboarding')) {
      const select = request.nextUrl.clone();
      select.pathname = '/select-role';
      select.search = '';
      return NextResponse.redirect(select);
    }
    // Already finished — no reason to sit on /select-role.
    if (hasRole && path === '/select-role') {
      const dashboard = request.nextUrl.clone();
      dashboard.pathname =
        profile?.active_role === 'client' ? '/dashboard/client' : '/dashboard/talent';
      dashboard.search = '';
      return NextResponse.redirect(dashboard);
    }
    return response;
  }

  // Everything else is dashboard territory and needs a completed role profile.
  if (!hasRole) {
    const target = request.nextUrl.clone();
    target.search = '';
    if (hasChosen) {
      // Mid-onboarding: resume where they left off rather than restarting the choice.
      target.pathname =
        profile?.active_role === 'client'
          ? '/onboarding/client/company'
          : '/onboarding/talent/basics';
    } else {
      target.pathname = '/select-role';
    }
    return NextResponse.redirect(target);
  }

  // Someone with a role has no reason to sit on the auth screens.
  if (path === '/login' || path === '/signup') {
    const dashboard = request.nextUrl.clone();
    dashboard.pathname =
      profile?.active_role === 'client' ? '/dashboard/client' : '/dashboard/talent';
    dashboard.search = '';
    return NextResponse.redirect(dashboard);
  }

  return response;
}
