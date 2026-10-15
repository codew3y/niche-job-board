import type { NextRequest } from 'next/server';

import { updateSession } from '@techselect/backend/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets: images, fonts and video.
     *
     * Running middleware on every request is what keeps the session alive — Server Components
     * cannot write cookies, so the token refresh has to happen here. Excluding assets keeps
     * that cost off requests that do not need a session.
     *
     * Video stays excluded: any clip in public/ is requested by signed-out visitors, and the
     * route policy would otherwise redirect it to the login instead of serving the file.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|mp4|webm)$).*)',
  ],
};
