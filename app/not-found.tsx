import { Compass } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';
import { buttonStyles } from '@/components/ui/button';
import { logoHref } from '@/lib/roles';
import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Not found' };

/**
 * The 404 (DESIGN.md §1, A6). It is deliberately the same answer for "does not exist" and "exists
 * but is not yours": a draft job or an unpublished profile 404s rather than 403s, because a 403
 * confirms the thing exists (docs/api.md §4). So the copy never claims the page was deleted.
 */
export default async function NotFound() {
  const home = logoHref(Boolean(await getSessionUser()));

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main
        id="main"
        className="gutter mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center py-20 text-center"
      >
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-md bg-primary-subtle text-primary"
        >
          <Compass size={22} weight="duotone" />
        </span>
        <p className="mt-6 font-mono text-sm text-text-subtle">404</p>
        <h1 className="mt-2 text-display-md text-balance">Nothing here</h1>
        <p className="mt-4 text-text-muted text-pretty">
          That page doesn&rsquo;t exist, or it isn&rsquo;t public. If someone sent you a link, it
          may have been unpublished or closed.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={home} className={buttonStyles({ size: 'lg' })}>
            {home === '/' ? 'Go to the home page' : 'Back to your dashboard'}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
