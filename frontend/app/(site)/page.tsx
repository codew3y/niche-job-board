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
import Image from 'next/image';
import Link from 'next/link';
import { Suspense, type CSSProperties } from 'react';

import { BoardStats } from '@/components/site/board-stats';
import { CategoryGrid } from '@/components/site/category-grid';
import { DeletedNotice } from '@/components/site/deleted-notice';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { MatchPreview } from '@/components/site/match-preview';
import { CONTAINER, PageCta, SECTION } from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';
import heroBackground from '@/public/images/home/hero-background.jpg';

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
 * (backend/src/supabase/route-policy.ts). There is deliberately no second check here: one would
 * read the session cookie and make the page render per request for everyone.
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

/**
 * PRE-BUILT, rebuilt at most every 5 minutes for the live board counts. Nothing here reads the
 * request (no cookies, no query string on the server), so the page is served from the cache and
 * prefetched in full, and a header click lands immediately.
 */
export const revalidate = 300;

export default function Home() {
  return (
    <>
      <Suspense fallback={null}>
        <DeletedNotice />
      </Suspense>

      {/* ───────────── Hero ─────────────
          A full-bleed photograph, dark in both themes: the section carries data-theme="dark", so
          the text, buttons and live counts take the dark-theme tokens without a second copy of
          them, and `hero-scrim` lays ink over the photo (heaviest behind the copy, open on the
          right where the subject is; evenly dark on phones). It fills the first screen below the
          header. Four text elements: eyebrow, headline, subtext (20 words), actions; the live
          counts sit under them as data, not copy.

          Photo: Shamin Haky, https://unsplash.com/photos/RIk-i9rXPao (Unsplash License), graded
          to the site palette. Two developers going through real code together: someone judging
          shipped work, which is the product. The LCP element, so preloaded at high priority with
          a blurred preview and never faded in. */}
      <section data-theme="dark" className="relative isolate overflow-hidden bg-surface text-text">
        <Image
          src={heroBackground}
          alt=""
          fill
          preload
          fetchPriority="high"
          placeholder="blur"
          sizes="100vw"
          className="-z-20 object-cover object-[62%_50%]"
        />
        <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

        <div
          className={cn(
            CONTAINER,
            'grid min-h-[calc(100svh-4rem-env(safe-area-inset-top,0px))] content-center py-16 sm:py-20 lg:grid-cols-12 lg:py-24',
          )}
        >
          <div className="animate-rise lg:col-span-7">
            <p className="font-mono text-xs text-text-muted">Software, web and automation work</p>
            <h1 className="mt-5 max-w-[14ch] text-display-lg">Hire builders, not buzzwords.</h1>
            <p className="mt-7 max-w-[42ch] text-lg text-text-muted">
              Matching reads the projects you describe and the brief a client writes, then says in
              one sentence why they fit.
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
        </div>
      </section>

      {/* ───────────── What a match looks like ─────────────
          The example match that used to share the hero, now with room to be read: the claim on
          the left, the example itself (labelled as one) on the right. Stacked below `lg`. */}
      <section aria-labelledby="example-heading" className={cn(CONTAINER, SECTION)}>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="reveal lg:col-span-5 lg:pr-4">
            <h2 id="example-heading" className="max-w-[18ch] text-display-sm">
              Every match comes with a reason
            </h2>
            <p className="mt-5 max-w-[44ch] text-lg text-text-muted">
              Clients see developers in order of fit, each with one sentence on why. Never a score
              on a person, and when nothing fits, it says so.
            </p>
          </div>
          <MatchPreview />
        </div>
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
