import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LandingAuth } from '@/components/auth/landing-auth';
import { Logo } from '@/components/layout/logo';
import { VideoBackground } from '@/components/marketing/video-background';
import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * The front door: a full-screen video with the wordmark, one line, and the login container on
 * top. Nothing else — no navbar, no browse links, no dashboard content.
 *
 * Signed-in visitors never see it: the proxy sends them to their dashboard
 * (lib/supabase/route-policy.ts), and this page re-checks in case the proxy was bypassed.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; deleted?: string; tab?: string; error?: string }>;
}) {
  if (await getSessionUser()) redirect('/dashboard');

  const { next, deleted, tab, error } = await searchParams;
  // Path only. An absolute URL here would be an open redirect.
  const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : undefined;

  return (
    <div className="relative flex min-h-dvh flex-col">
      <VideoBackground />

      <main
        id="main"
        className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4 py-12 text-center"
      >
        <div className="text-white">
          <h1>
            <Logo href="/" size="lg" />
          </h1>
          <p className="mt-3 text-base text-white/85 text-balance">
            Software, web and automation work — hired on what you have built.
          </p>
        </div>

        <LandingAuth
          initialTab={tab === 'signup' ? 'signup' : 'login'}
          next={safeNext}
          error={error}
          // Where a deleted account lands. Signing someone out onto a login with no
          // acknowledgement reads as a failure, not a completion.
          notice={
            deleted === '1'
              ? 'Your account has been deleted. Conversations you were part of survive with your side removed.'
              : undefined
          }
        />
      </main>
    </div>
  );
}
