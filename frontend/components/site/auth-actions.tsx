'use client';

import { ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { useSignedIn } from '@/lib/supabase/use-signed-in';

/**
 * The header's right-hand actions: "Go to dashboard" for someone signed in (offering them "Sign
 * up" reads as the product forgetting them), otherwise Log in and Sign up. On /login and /signup
 * (`current`) the button for the page you are on is left out.
 *
 * Decided in the browser (useSignedIn), so the pages around it can be pre-built and cached.
 */
export function AuthActions({ current }: { current?: 'login' | 'signup' }) {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Link
        href="/dashboard"
        className={buttonStyles({ size: 'sm', className: 'rounded-full px-4' })}
      >
        Go to dashboard
        <ArrowRight aria-hidden="true" />
      </Link>
    );
  }

  return (
    <>
      {current !== 'login' && (
        <Link
          href="/login"
          className={buttonStyles({ variant: 'ghost', size: 'sm', className: 'rounded-full' })}
        >
          Log in
        </Link>
      )}
      {current !== 'signup' && (
        <Link
          href="/signup"
          className={buttonStyles({ size: 'sm', className: 'rounded-full px-4' })}
        >
          Sign up
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
    </>
  );
}
