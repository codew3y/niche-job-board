import Link from 'next/link';
import type { ReactNode } from 'react';

import { buttonStyles } from '@/components/ui/button';

/** Page intro for the public content pages: eyebrow, h1, lead paragraph. */
export function PageIntro({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-10 sm:px-6 sm:pt-20">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-accent">{eyebrow}</p>
        <h1 className="mt-3 text-display-md text-balance">{title}</h1>
        <p className="mt-5 text-lg text-text-muted text-pretty">{lead}</p>
        {children && <div className="mt-8 flex flex-wrap items-center gap-4">{children}</div>}
      </div>
    </section>
  );
}

/** A numbered three-step list — the "How it works" columns from the old landing page. */
export function NumberedSteps({ steps }: { steps: readonly (readonly [string, string])[] }) {
  return (
    <ol className="divide-y divide-border-base border-y border-border-base">
      {steps.map(([title, body], i) => (
        <li key={title} className="grid grid-cols-[2.75rem_1fr] gap-4 py-5">
          <span className="text-2xl font-semibold text-accent tabular-nums">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="mt-1 text-text-muted">{body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A titled block of feature cards in a responsive grid. */
export function FeatureGrid({
  heading,
  items,
}: {
  heading: string;
  items: readonly { title: string; body: string }[];
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="text-display-sm text-balance">{heading}</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li
            key={item.title}
            className="rounded-lg border border-border-base bg-surface-raised p-5"
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1.5 text-sm text-text-muted text-pretty">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Closing call to action shared by the content pages. */
export function PageCta({
  title,
  primary,
  secondary,
}: {
  title: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto mb-20 max-w-6xl px-4 pt-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-6 rounded-lg border border-border-base bg-surface-raised px-6 py-8 sm:px-10">
        <p className="max-w-xl text-xl font-semibold text-balance">{title}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={primary.href} className={buttonStyles({ size: 'lg' })}>
            {primary.label}
          </Link>
          {secondary && (
            <Link href={secondary.href} className="prose-link font-semibold">
              {secondary.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
