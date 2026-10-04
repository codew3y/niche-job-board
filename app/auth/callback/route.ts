import { NextResponse, type NextRequest } from 'next/server';

import { sendWelcomeOnce } from '@/lib/email/welcome';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth callback for Google and GitHub.
 *
 * Exchanges the one-time code for a session, then sends the user on. `/select-role` is the
 * default landing spot — middleware bounces them onward if they already have a role.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');
  // Path only. Honouring an absolute URL here would let an attacker use our own OAuth
  // callback as an open redirect.
  const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/select-role';

  // `link=1` marks a "Connect GitHub / LinkedIn" round trip from a signed-in profile page
  // (components/talent/connected-accounts.tsx). Its failures go back to that page, not to the
  // login screen: the person is still signed in.
  const linking = searchParams.get('link') === '1';

  if (!code) {
    const raw = searchParams.get('error_description');
    if (linking) {
      const message = /already linked|identity.*exists|already.*(used|registered)/i.test(raw ?? '')
        ? 'That account is already connected to a different TechSelect account.'
        : raw
          ? 'The connection was not completed.'
          : 'The connection was cancelled.';
      return NextResponse.redirect(
        `${origin}${target}?connect_error=${encodeURIComponent(message)}`,
      );
    }
    const error = raw ?? 'Sign-in was cancelled.';
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Could not complete sign-in. Please try again.')}`,
    );
  }

  /**
   * Both auth landings call this, because there are two ways to arrive with a session for the
   * first time. It is a no-op for everyone who has been welcomed already, so calling it on
   * every OAuth sign-in is correct rather than wasteful.
   */
  // Copy any GitHub / LinkedIn identity onto the developer profile (migration 0021). Runs on
  // every OAuth return, sign-in or connect; a no-op without a profile. Best effort.
  await supabase.rpc('sync_connected_accounts');

  await sendWelcomeOnce();

  /*
   * Deployment note: behind a proxy, `origin` is the internal host. Vercel sets
   * x-forwarded-host, so prefer it when present — otherwise preview deploys redirect users to
   * the wrong hostname after a successful sign-in.
   */
  const forwardedHost = request.headers.get('x-forwarded-host');
  const base = forwardedHost ? `https://${forwardedHost}` : origin;
  return NextResponse.redirect(`${base}${target}`);
}
