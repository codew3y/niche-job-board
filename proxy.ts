import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

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
     * Video MUST be excluded: the landing page's clips (/video/*.mp4, *.webm) are requested by
     * signed-out visitors, and the route policy would otherwise redirect every one of them to
     * the login instead of serving the file.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?|mp4|webm)$).*)',
  ],
};
