import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for the two legal pages.
 *
 * `lastUpdated` is a required prop rather than `new Date()`: a policy page that always claims
 * to have been updated today is lying about the one fact on it that a reader might rely on.
 */
export function LegalPage({
  title,
  intro,
  lastUpdated,
  children,
}: {
  title: string;
  intro: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link href="/" className="text-text-muted hover:text-text">
          ← TechSelect
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        <p className="mt-2 text-text-muted text-pretty">{intro}</p>
        <p className="mt-3 text-sm text-text-subtle">
          Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
        </p>
      </header>

      <div className="mt-8 space-y-8 leading-relaxed">{children}</div>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium tracking-tight">{heading}</h2>
      {children}
    </section>
  );
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
