import type { ReactNode } from 'react';

import { Logo } from '@/components/layout/logo';
import { logoHref } from '@/lib/roles';
import { getSessionUser } from '@/lib/supabase/session';

/**
 * The shell for the secondary auth screens: choose a role, reset a password, verify, and the
 * standalone /login and /signup (the landing page is the usual way in).
 *
 * One calm, narrow column (24rem): a sign-in form stretched wide makes every field a long walk
 * for the eye. The API is unchanged, so every auth page kept working through the redesign.
 */
export async function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  // Some of these screens are reached signed in (choosing a role, setting a new password).
  const home = logoHref(Boolean(await getSessionUser()));

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="gutter pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
        <Logo href={home} />
      </div>

      <main id="main" className="gutter flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-display-sm text-balance">{title}</h1>
          {subtitle && <p className="mt-2 text-text-muted text-pretty">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-8 border-t border-border-base pt-6 text-sm text-text-muted">
              {footer}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export { OrDivider } from './or-divider';
