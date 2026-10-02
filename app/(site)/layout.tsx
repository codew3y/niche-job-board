import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

/**
 * The public site: Home, For Freelancers, For Clients, How It Works, About. Shared header and
 * footer; the pages below own their <main> content only. Route groups do not affect URLs.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grain flex min-h-dvh flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
