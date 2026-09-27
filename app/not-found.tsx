import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { buttonStyles } from '@/components/ui/button';
import { getSessionProfile } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Not found' };

/**
 * The 404 (DESIGN.md §1, A6). It is deliberately the same answer for "does not exist" and "exists
 * but is not yours" — a draft job or an unpublished profile 404s rather than 403s, because a 403
 * confirms the thing exists (docs/api.md §4). So the copy never claims the page was deleted.
 */
export default async function NotFound() {
  const profile = await getSessionProfile();
  const dashboard =
    profile && (profile.hasTalent || profile.hasClient)
      ? profile.activeRole === 'client'
        ? '/dashboard/client'
        : '/dashboard/talent'
      : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader dashboard={dashboard} />
      <main
        id="main"
        className="gutter mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-20 text-center"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-full bg-surface-sunken text-text-subtle"
        >
          <Compass size={22} />
        </span>
        <p className="mt-6 font-mono text-sm text-text-subtle">404</p>
        <h1 className="mt-2 font-serif text-display-md text-balance">Nothing here</h1>
        <p className="mt-4 text-text-muted text-pretty">
          That page doesn&rsquo;t exist, or it isn&rsquo;t public. If someone sent you a link, it
          may have been unpublished or closed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link href={dashboard ?? '/'} className={buttonStyles()}>
            {dashboard ? 'Back to your dashboard' : 'Go to the home page'}
          </Link>
          <Link href="/jobs" className={buttonStyles({ variant: 'secondary' })}>
            Browse jobs
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
