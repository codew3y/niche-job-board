'use client';

import { useEffect, useState } from 'react';

import { createClient } from './client';

/**
 * Whether a session exists, read in the browser.
 *
 * The public site's header used to ask the server, which made every public page render per
 * request (reading cookies opts a page out of the cache) and left header clicks waiting on a
 * round trip. The session cookie is readable here, and getSession() reads it without a network
 * call, so the pages are pre-built and the header settles right after hydration.
 *
 * `false` until known: a signed-out visitor, the common case on these pages, sees the right
 * buttons on the first frame. Follows sign-in and sign-out in other tabs.
 */
export function useSignedIn(): boolean {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSignedIn(Boolean(data.session));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return signedIn;
}
