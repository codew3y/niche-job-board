'use client';

import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { useSignedIn } from '@/lib/supabase/use-signed-in';

/**
 * The 404's way out: the home page, or the dashboard for someone signed in (the same rule as the
 * logo, backend/src/roles.ts `logoHref`).
 *
 * Decided in the browser. The root not-found boundary is mounted in EVERY route, so reading the
 * session on the server here made the whole site render per request, including the public pages
 * that should be pre-built.
 */
export function NotFoundHomeLink() {
  const signedIn = useSignedIn();
  return (
    <Link href={signedIn ? '/dashboard' : '/'} className={buttonStyles({ size: 'lg' })}>
      {signedIn ? 'Back to your dashboard' : 'Go to the home page'}
    </Link>
  );
}
