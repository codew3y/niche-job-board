import {
  ArrowRight,
  CheckCircle,
  LockSimple,
  Prohibit,
  Robot,
  TagSimple,
  XCircle,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense, type CSSProperties } from 'react';

import { BoardStats } from '@/components/site/board-stats';
import { CategoryGrid } from '@/components/site/category-grid';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { MatchPreview } from '@/components/site/match-preview';
import { CONTAINER, HERO_SECTION, PageCta } from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@techselect/backend/supabase/session';
import { cn } from '@/lib/ui/cn';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Home. The "Quiet ledger" direction (October 2026 redesign).
 *
 * Five sections, five layout families: a 6/6 split hero with an example match, a category
 * bento, a row of steps with photos, never/instead cards for the principles, and the closing
 * band. One eyebrow, in the hero.
 *
 * Removed in the redesign, as decoration that did no job (minimalist-ui): the scrolling skills
 * ticker, the example-match card laid over the hero photo (taste-skill bans overlays on images
 * and mocked-up product UI). The photos on the home steps came back in October 2026 at the
 * owner's request, shared with /how-it-works.
 *
 * CTA labels, one per intent, identical everywhere on the site: "Create a profile" (developer
 * sign-up), "Post a brief" (client sign-up), "Sign up" (the header's generic sign-up).
 *
 * The large quoted example match that sat below the steps was removed in October 2026: the hero
 * panel now shows a whole example match, and the quote repeated it.
 *
 * Content history: "What a match looks like", "What it will not do" and the closing line come
 * from the landing page at b9fe7d4 (introduced in eb8bb6c). The headline was "Hired for the
 * work, not the keywords." until October 2026.
 *
 * Hero panel: an example match (frontend/components/site/match-preview.tsx), labelled as an example, in
 * place of the photograph used until October 2026.
 *
 * Signed-in visitors never see this page: the proxy sends them to their dashboard
 * (backend/src/supabase/route-policy.ts), and this re-checks in case the proxy was bypassed.
 */
const PRINCIPLES = [
  {
    title: 'Rank keywords over work',
    body: 'Someone who shipped the work outranks someone who listed the tool.',
    icon: TagSimple,
  },
  {
    title: 'Hide anything behind AI',
    body: 'Search and filters find every job and every developer on their own.',
    icon: Robot,
  },
  {
    title: 'Gatekeep who may list',
    body: 'Open to every developer. No fees, no approval queue, no middleman.',
    icon: LockSimple,
  },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  if (await getSessionUser()) redirect('/dashboard');

  // Where a deleted account lands. Signing someone out with no acknowledgement reads as a
  // failure, not a completion.
  const deleted = (await searchParams).deleted === '1';

  return (
    <>
      {deleted && (
        <div className={cn(CONTAINER, 'pt-6')}>
          <p
            role="status"
            className="flex items-start gap-3 rounded-lg bg-success-subtle px-5 py-4 text-sm text-text-muted"
          >
            <CheckCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
            <span>
              <strong className="font-semibold text-text">Your account has been deleted.</strong>{' '}
              Anything you posted is gone. Conversations you were part of stay, with your side
              removed, as the privacy policy sets out.
            </span>
          </p>
        </div>
      )}

      {/* ───────────── Hero ─────────────
          HERO_SECTION (components/site/page-parts.tsx): copy across 6 columns beside the example
          match across 6, filling the first screen so the next section starts below the fold.
          Every page intro shares it. Four text elements: eyebrow, headline (two lines from
          `sm`), subtext (20 words), actions. */}
      <section className={cn(CONTAINER, HERO_SECTION)}>
        <div className="animate-rise lg:col-span-6 lg:pr-8">
          <p className="font-mono text-xs text-text-subtle">Software, web and automation work</p>
          <h1 className="mt-5 max-w-[14ch] text-display-lg">Hire builders, not buzzwords.</h1>
          <p className="mt-7 max-w-[42ch] text-lg text-text-muted">
            Matching reads the projects you describe and the brief a client writes, then says in one
            sentence why they fit.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/signup?role=talent" className={buttonStyles({ size: 'lg' })}>
              Create a profile
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link
              href="/signup?role=client"
              className={buttonStyles({ variant: 'secondary', size: 'lg' })}
            >
              Post a brief
            </Link>
          </div>

          {/* Live counts from the board, never padded. Streamed, so the hero never waits. */}
          <Suspense fallback={null}>
            <BoardStats />
          </Suspense>
        </div>

        <MatchPreview />
      </section>

      <CategoryGrid />

      {/* The steps sit on the sunken well: a tint within the same theme, not an inverted band. */}
      <div className="border-y border-border-base bg-surface-sunken">
        <HowItWorksSteps
          footer={
            <Link
              href="/how-it-works"
              className="pressable mt-12 inline-flex min-h-10 items-center gap-2 font-medium text-text hover:text-link"
            >
              More on how it works
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          }
        />
      </div>

      {/* ───────────── Principles ─────────────
          Three cards, each in two halves: what the board will never do, behind a rose cross beside
          a rose icon tile, and under a hairline what it does instead, with a check. Plain card
          backgrounds; the colour is in the two icons. One column on phones, three from `md`. Top
          padding only: the closing band below brings its own. */}
      <section aria-labelledby="principles-heading" className={cn(CONTAINER, 'pt-section')}>
        <div className="reveal grid gap-4 md:grid-cols-12 md:items-end">
          <h2 id="principles-heading" className="text-display-sm md:col-span-7">
            What it will not do
          </h2>
          <p className="max-w-[44ch] text-text-muted md:col-span-5 md:justify-self-end">
            No approval queue and nothing to qualify for. Three lines the board does not cross.
          </p>
        </div>
        <ul className="mt-12 grid gap-4 md:grid-cols-3 lg:mt-16">
          {PRINCIPLES.map(({ title, body, icon: Icon }, i) => (
            <li
              key={title}
              style={{ '--i': i } as CSSProperties}
              className="reveal liftable flex flex-col rounded-xl border border-border-base bg-surface-raised hover:border-border-strong"
            >
              <div className="p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300"
                  >
                    <Icon size={22} weight="duotone" />
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-base px-2.5 py-0.5 text-xs font-medium text-text-muted">
                    <Prohibit aria-hidden="true" size={12} />
                    Never
                  </span>
                </div>
                {/* A cross, mirroring the check below: never this, but that. */}
                <h3 className="mt-6 flex gap-3 text-xl font-semibold tracking-tight text-balance">
                  <XCircle
                    aria-hidden="true"
                    size={20}
                    weight="fill"
                    className="mt-1 shrink-0 text-rose-600 dark:text-rose-400"
                  />
                  <span>
                    <span className="sr-only">Never: </span>
                    {title}
                  </span>
                </h3>
              </div>
              <div className="mt-auto flex gap-3 border-t border-border-base p-6 sm:px-7">
                <CheckCircle
                  aria-hidden="true"
                  size={20}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-success"
                />
                <p className="text-text-muted">
                  <span className="sr-only">Instead: </span>
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <PageCta
        title="Show the work. Let the right people find it."
        primary={{ href: '/signup?role=talent', label: 'Create a profile' }}
        secondary={{ href: '/signup?role=client', label: 'Post a brief' }}
      />
    </>
  );
}
