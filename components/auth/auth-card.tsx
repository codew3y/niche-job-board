import Link from 'next/link';
import type { ReactNode } from 'react';

import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * The shell for every auth screen: sign in, sign up, choose a role, reset, verify.
 *
 * Split on wide screens — an ink panel carrying the product's one-line promise beside the form
 * — and a single calm column on phones, where the panel would only push the form below the
 * fold. The form column is narrow on purpose (24rem): a sign-in form stretched to 60rem makes
 * every field a long walk for the eye.
 *
 * The API is unchanged from before the rebuild, so every auth page kept working while its
 * contents were redesigned.
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
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <aside
        aria-hidden="true"
        className="relative hidden flex-col justify-between overflow-hidden bg-surface-inverse p-12 text-text-inverse lg:flex"
      >
        <span className="font-serif text-3xl">TechSelect</span>
        <div>
          <p className="max-w-md font-serif text-display-md text-balance">
            Hired for the work, <em className="opacity-70">not</em> the keywords.
          </p>
          <p className="mt-6 max-w-sm text-sm opacity-70">
            A job board for software, web and automation work. Open to every developer; clients
            decide.
          </p>
        </div>
        <p className="text-sm opacity-60">No approval queue. Nothing to qualify for.</p>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <div className="gutter flex items-center justify-between pt-[max(1rem,env(safe-area-inset-top,0px))] pb-2">
          <Link href="/" className="font-serif text-[1.625rem] leading-none lg:invisible">
            TechSelect
          </Link>
          <ThemeToggle />
        </div>

        <main id="main" className="gutter flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-rise">
            <h1 className="font-serif text-display-sm text-balance">{title}</h1>
            {subtitle && <p className="mt-3 text-text-muted text-pretty">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && (
              <p className="mt-8 border-t border-border-base pt-6 text-sm text-text-muted">
                {footer}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/** Visual break between the OAuth buttons and the email form. */
export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border-base" />
      <span className="text-xs tracking-eyebrow text-text-subtle uppercase">or with email</span>
      <span className="h-px flex-1 bg-border-base" />
    </div>
  );
}
