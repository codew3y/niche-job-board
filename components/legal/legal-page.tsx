import { ArrowLeft } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Shared shell for the two legal pages.
 *
 * Set as a document: a 65-character measure, generous leading, hairline section rules. Legal text
 * is the one place on the site people actually read every word of, when they read it at all.
 *
 * `lastUpdated` is a required prop rather than `new Date()`: a policy page that always claims to
 * have been updated today is lying about the one fact on it that a reader might rely on.
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
    <div className="mx-auto w-full max-w-3xl flex-1 py-10 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-sm">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-text-muted hover:bg-surface-sunken hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> TechSelect
        </Link>
      </nav>

      {/* The one eyebrow on the page, and it carries a fact (the date), not a category. */}
      <header className="rounded-lg border border-border-base bg-surface-raised px-6 py-8 sm:px-10 sm:py-10">
        <p className="font-mono text-xs text-text-subtle">
          Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>
        </p>
        <h1 className="mt-3 text-display-md text-balance">{title}</h1>
        <p className="mt-4 max-w-[65ch] text-lg text-text-muted text-pretty">{intro}</p>
      </header>

      <div className="mt-12 max-w-[65ch] space-y-12 leading-relaxed sm:px-10 [&_a]:prose-link [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-semibold text-balance">{heading}</h2>
      <div className="space-y-3 text-text-muted">{children}</div>
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
