import { ArrowRight, Briefcase, Sparkle } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The home hero's right-hand panel: what a match looks like, in place of a stock photograph. One
 * brief at the top, then three developers in ranked order, each with the one sentence matching
 * writes about why they fit.
 *
 * EXAMPLE DATA, LABELLED AS SUCH. Nobody here is a real person and the brief is not a real job:
 * putting invented "why they fit" sentences beside real developers' names would misrepresent
 * them. The "Example" tag says so, and the people have first names only.
 *
 * Order and a reason, never a number on a person (ADR-007 D2): the ranks are positions, and
 * there is no score anywhere in the panel.
 *
 * SHAPE. The same frame and half-width footprint as the live board panels on Freelancers and
 * Clients (board-showcase.tsx), so the three heroes line up; as tall as its content, which is
 * short and fixed, rather than a scrolling box. The developer cards rise in one after
 * another on load, which is the idea of ranking in motion; reduced motion gets a plain fade.
 */

const BRIEF = {
  client: 'Example client',
  title: 'Move our billing onto Stripe without losing history',
  budget: '$6,000–$9,000',
  engagement: 'Fixed price',
  skills: ['Stripe', 'PostgreSQL', 'TypeScript'],
};

const MATCHES = [
  {
    initials: 'MS',
    name: 'Maria',
    headline: 'Payments engineer · Stripe and Postgres',
    rate: '$75/hr',
    reason:
      'Has shipped this exact migration twice, with proration, and names the backfill that keeps old invoices intact.',
    tint: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  {
    initials: 'JK',
    name: 'Jonas',
    headline: 'Full-stack developer · billing and subscriptions',
    rate: '$68/hr',
    reason:
      'Rebuilt a subscription checkout on Stripe; less migration work, but strong on the data.',
    tint: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
  },
  {
    initials: 'AL',
    name: 'Aiko',
    headline: 'Backend developer · Postgres and APIs',
    rate: '$60/hr',
    reason: 'Deep Postgres work and webhook handling; Stripe is newer to her, and she says so.',
    tint: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  },
];

export function MatchPreview() {
  return (
    <section aria-label="Example match" className="frame-tray min-w-0 lg:col-span-6">
      <div className="rounded-inner flex flex-col gap-4 bg-surface-raised p-4 sm:p-5">
        <header className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold">
            <Sparkle aria-hidden="true" size={16} weight="duotone" className="text-primary" />
            What a match looks like
          </p>
          <span className="rounded-full border border-border-base bg-surface px-2.5 py-0.5 font-mono text-xs text-text-subtle">
            Example
          </span>
        </header>

        {/* The brief */}
        <div className="rounded-lg border border-border-base bg-surface-sunken p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-subtle">
            <Briefcase aria-hidden="true" size={14} />
            Brief · {BRIEF.client}
          </p>
          <p className="mt-1.5 font-semibold tracking-tight text-balance">{BRIEF.title}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            <span className="font-medium text-text tabular-nums">{BRIEF.budget}</span>
            <span>{BRIEF.engagement}</span>
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {BRIEF.skills.map((s) => (
              <li
                key={s}
                className="rounded-sm border border-border-base bg-surface-raised px-1.5 py-0.5 text-xs text-text-muted"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>

        <p className="px-1 text-xs font-medium tracking-wide text-text-subtle uppercase">
          Best fit first
        </p>

        {/* The ranked developers. A list in order: the position is the ranking. */}
        <ol className="flex flex-col gap-2.5">
          {MATCHES.map((m, i) => (
            <li
              key={m.name}
              style={{ animationDelay: `${300 + i * 160}ms` } as CSSProperties}
              className={cn(
                'animate-rise flex gap-3 rounded-lg border bg-surface p-3.5',
                i === 0 ? 'border-primary/40 ring-1 ring-primary/15' : 'border-border-base',
              )}
            >
              <span
                aria-hidden="true"
                className="w-4 shrink-0 pt-2 text-center font-mono text-xs text-text-subtle tabular-nums"
              >
                {i + 1}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold',
                  m.tint,
                )}
              >
                {m.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-x-3">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{m.name}</p>
                  <p className="shrink-0 text-sm font-medium tabular-nums">{m.rate}</p>
                </div>
                <p className="truncate text-xs text-text-subtle">{m.headline}</p>
                <p className="mt-1.5 text-sm text-text-muted italic text-pretty">“{m.reason}”</p>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href="/how-it-works"
          className="inline-flex min-h-9 items-center gap-1 self-start rounded-md px-1 text-sm font-medium text-link hover:underline"
        >
          How matching works
          <ArrowRight aria-hidden="true" size={14} />
        </Link>
      </div>
    </section>
  );
}
