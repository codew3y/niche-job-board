import Link from 'next/link';
import type { ReactNode } from 'react';

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
    <main id="main" className="flex-1 grid place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 block text-center font-mono text-sm text-text-subtle hover:text-text transition-colors duration-[--duration-fast]"
        >
          nichejobboard
        </Link>

        <div className="rounded-[--radius] border border-border-base bg-surface-raised p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-text-muted text-pretty">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <p className="mt-6 text-center text-sm text-text-muted">{footer}</p>}
      </div>
    </main>
  );
}

/** Visual break between the OAuth buttons and the email form. */
export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-border-base" />
      <span className="text-xs uppercase tracking-wide text-text-subtle">or</span>
      <span className="h-px flex-1 bg-border-base" />
    </div>
  );
}
