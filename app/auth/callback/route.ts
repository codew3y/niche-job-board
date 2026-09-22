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

  if (!code) {
    const error = searchParams.get('error_description') ?? 'Sign-in was cancelled.';
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
