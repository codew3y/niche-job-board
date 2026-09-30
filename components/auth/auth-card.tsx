import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/site-footer';
import { SiteHeader } from '@/components/site/site-header';

/**
 * The shell for the auth screens (/login, /signup, choose a role, reset a password, verify),
 * inside the same header and footer as the rest of the public site.
 *
 * One calm, narrow column (28rem): a sign-in form stretched wide makes every field a long walk
 * for the eye. From `sm` up the column becomes a raised panel so the form reads as one object on
 * a wide, empty page; on a phone the panel chrome is dropped, because a bordered box inside a
 * 360px screen only steals width from the fields. The API is unchanged, so every auth page kept
 * working through the redesign.
 */
export function AuthCard({
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
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <SiteHeader />

      <main
        id="main"
        className="gutter flex flex-1 items-start justify-center py-10 sm:items-center sm:py-16"
      >
        <div className="w-full max-w-md sm:rounded-lg sm:border sm:border-border-base sm:bg-surface-raised sm:p-8 sm:shadow-sm">
          <h1 className="font-display text-display-sm text-balance">{title}</h1>
          {subtitle && <p className="mt-2 text-text-muted text-pretty">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-8 border-t border-border-base pt-6 text-sm text-text-muted">
              {footer}
            </p>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

export { OrDivider } from './or-divider';
