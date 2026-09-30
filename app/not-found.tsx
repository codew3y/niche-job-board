import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Logo } from '@/components/layout/logo';
import { buttonStyles } from '@/components/ui/button';
import { logoHref } from '@/lib/roles';
import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Not found' };

/**
 * The 404 (DESIGN.md §1, A6). It is deliberately the same answer for "does not exist" and "exists
 * but is not yours" — a draft job or an unpublished profile 404s rather than 403s, because a 403
 * confirms the thing exists (docs/api.md §4). So the copy never claims the page was deleted.
 */
export default async function NotFound() {
  const home = logoHref(Boolean(await getSessionUser()));

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:px-8">
        <Logo href={home} />
      </div>
      <main
        id="main"
        className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-20 text-center"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-md bg-surface-sunken text-text-subtle"
        >
          <Compass size={22} />
        </span>
        <p className="mt-6 text-sm text-text-subtle">404</p>
        <h1 className="mt-2 text-display-md text-balance">Nothing here</h1>
        <p className="mt-4 text-text-muted text-pretty">
          That page doesn&rsquo;t exist, or it isn&rsquo;t public. If someone sent you a link, it
          may have been unpublished or closed.
        </p>
        <div className="mt-8">
          <Link href={home} className={buttonStyles()}>
            {home === '/' ? 'Go to the home page' : 'Back to your dashboard'}
          </Link>
        </div>
      </main>
    </div>
  );
}
