import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files.
     *
     * Running middleware on every request is what keeps the session alive — Server Components
     * cannot write cookies, so the token refresh has to happen here. Excluding assets keeps
     * that cost off requests that do not need a session.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)',
  ],
};
