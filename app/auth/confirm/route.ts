import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

import { sendWelcomeOnce } from '@/lib/email/welcome';
import { createClient } from '@/lib/supabase/server';

/** Email confirmation and magic-link/recovery landing. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('That link is not valid.')}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('That link has expired. Request a new one.')}`,
    );
  }

  /**
   * Not on a recovery link. Someone resetting a password is not a new account, and greeting
   * them with "welcome" is how a product shows it is not paying attention.
   */
  if (type !== 'recovery') await sendWelcomeOnce();

  if (type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password/confirm`);
  }

  /**
   * Honour the choice they already made.
   *
   * Someone who clicked "I'm looking for work" on the landing page has answered this
   * question. Sending them to /select-role after confirming their email asks it again, which
   * reads as the product not listening — and it is the exact step Upwork removes by asking
   * first.
   *
   * Read from metadata, which is client-writable, and that is fine here: the worst a forged
   * value can do is open the wrong onboarding screen. `/select-role` stays one link away, and
   * the role itself is only created by onboarding under RLS.
   */
  const { data } = await supabase.auth.getUser();
  const intent = data.user?.user_metadata?.intent;
  const next =
    intent === 'client'
      ? '/onboarding/client/company'
      : intent === 'talent'
        ? '/onboarding/talent/basics'
        : '/select-role';

  return NextResponse.redirect(`${origin}${next}`);
}
