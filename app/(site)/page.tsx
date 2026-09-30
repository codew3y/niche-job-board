import { ArrowRight, BadgeCheck, Quote, Search, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { HeroVideo } from '@/components/marketing/hero-video';
import { CategoryGrid } from '@/components/site/category-grid';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@/lib/supabase/session';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Home.
 *
 * RESTORED CONTENT — the hero copy, "What a match looks like", "What it will not do" and the
 * closing band are the landing page as it stood at b9fe7d4 (introduced in eb8bb6c), restyled to
 * the current tokens — including its hero video figure, brought back to balance the hero. The
 * "browse without an account" line is dropped because Browse now requires sign-in.
 *
 * Signed-in visitors never see this page: the proxy sends them to their dashboard
 * (lib/supabase/route-policy.ts), and this re-checks in case the proxy was bypassed.
 */
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
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <p
            role="status"
            className="rounded-lg border border-border-base bg-surface-raised px-5 py-4 text-sm text-text-muted text-pretty"
          >
            <strong className="font-semibold text-text">Your account has been deleted.</strong>{' '}
            Anything you posted is gone; conversations you were part of survive with your side
            removed, as the privacy policy sets out.
          </p>
        </div>
      )}

      {/* ───────────── Hero (restored copy, static) ───────────── */}
      {/* Two columns that stretch to the same height: the video panel is as tall as the text
          beside it, and wider than the text column, so it reads as landscape.

          The hero fills the first screen (viewport minus the 4rem header, its 1px border and any
          notch inset) with its content centred, so the next section starts below the fold
          instead of peeking in at the bottom. svh, not dvh: the height must not jump as a phone's
          browser bar shows and hides. */}
      <section className="mx-auto grid min-h-[calc(100svh-4rem-1px-env(safe-area-inset-top,0px))] max-w-6xl content-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-stretch lg:gap-12">
        <div>
          <p className="text-sm font-semibold text-accent">
            A job board for software, web &amp; automation work
          </p>
          <h1 className="mt-4 text-display-lg text-balance">
            Hired for the work, <span className="text-accent">not</span> the keywords.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-text-muted text-pretty">
            Matching reads the projects you describe and the brief a client writes, then says in one
            sentence why they fit — or that nothing does.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href="/signup?role=talent" className={buttonStyles({ size: 'lg' })}>
              I&rsquo;m looking for work
              <ArrowRight aria-hidden="true" />
            </Link>
            <Link href="/signup?role=client" className="prose-link font-semibold">
              I&rsquo;m hiring
            </Link>
          </div>

          {/* ADR-008, said on the front page rather than discovered after signing up. */}
          <p className="mt-8 max-w-lg border-t border-border-base pt-5 text-sm text-text-subtle">
            No approval queue and nothing to qualify for.
          </p>
        </div>

        {/* The hero figure, restored from b9fe7d4: a looping clip of a developer at work, poster
            first (the LCP image), video mounted after idle and never under reduced motion,
            Save-Data or 2G. No caption and no pause control, at the owner's request. Source and
            licence: hero-video.tsx. On phones it keeps a 16:9 box; from lg it fills the column
            height, matching the text. */}
        <figure className="relative aspect-video overflow-hidden rounded-lg border border-border-base bg-surface-sunken lg:aspect-auto lg:h-full lg:min-h-80">
          <HeroVideo
            poster="/video/hero-poster.jpg"
            webm="/video/hero.webm"
            mp4="/video/hero.mp4"
            label="a developer writing code at a laptop"
            controls={false}
          />
        </figure>
      </section>

      <CategoryGrid />

      <div className="border-y border-border-base bg-surface-raised">
        <HowItWorksSteps
          footer={
            <Link href="/how-it-works" className="prose-link mt-8 inline-block font-semibold">
              More on how it works
            </Link>
          }
        />
      </div>

      {/* ───────────── The differentiator, shown (restored) ───────────── */}
      <section aria-labelledby="example-heading">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
          <p id="example-heading" className="text-sm font-semibold text-text-subtle">
            What a match looks like — an example
          </p>
          <Quote aria-hidden="true" className="mx-auto mt-8 size-8 text-accent" />
          <blockquote className="mt-4 text-display-sm text-balance">
            Has shipped this exact migration twice — Stripe Billing with proration and a
            historical-invoice backfill — and names the job that keeps it safe.
          </blockquote>
          <p className="mx-auto mt-6 max-w-md text-sm text-text-muted">
            Every match carries a sentence like this, including where it falls short. When nothing
            fits, it says so instead of padding the list.
          </p>
        </div>
      </section>

      {/* ───────────── Principles (restored) ───────────── */}
      <section
        aria-labelledby="principles-heading"
        className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 sm:pb-24"
      >
        <h2 id="principles-heading" className="text-display-sm">
          What it will not do
        </h2>
        <ul className="mt-8 grid gap-px overflow-hidden rounded-lg border border-border-base bg-border-base sm:grid-cols-3">
          {(
            [
              [
                BadgeCheck,
                'Rank keywords over work',
                'Someone who shipped the work outranks someone who listed the tool.',
              ],
              [
                Search,
                'Hide anything behind AI',
                'Search and filters find every job and every developer on their own.',
              ],
              [
                UsersRound,
                'Gatekeep who may list',
                'Open to every developer. No fees, no approval queue, no middleman.',
              ],
            ] as const
          ).map(([Icon, title, body]) => (
            <li key={title} className="bg-surface-raised p-6">
              <Icon aria-hidden="true" size={20} className="text-accent" />
              <p className="mt-4 font-semibold">{title}</p>
              <p className="mt-1.5 text-sm text-text-muted">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── Closing band (restored) ───────────── */}
      <section className="mx-auto mb-20 max-w-6xl px-4 sm:px-6">
        {/* Inverse in light mode (ink band on paper). In dark mode "inverse" is near-white, which
            glared as a white slab on a dark page — so there it becomes a raised dark panel. */}
        <div className="rounded-lg border border-transparent bg-surface-inverse px-6 py-14 text-center text-text-inverse sm:px-12 dark:border-border-base dark:bg-surface-raised dark:text-text">
          <p className="mx-auto max-w-2xl text-display-sm text-balance">
            Show the work. Let the right people find it.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/signup?role=talent"
              className={buttonStyles({ variant: 'accent', size: 'lg' })}
            >
              Create a profile
            </Link>
            <Link
              href="/signup?role=client"
              // Its own classes, not buttonStyles + overrides: `cn` does not merge utilities, so a
              // secondary button's background would fight a transparent one.
              className="inline-flex h-12 items-center justify-center rounded-md border border-text-inverse/30 px-6 font-semibold text-text-inverse transition-colors duration-fast ease-out hover:border-text-inverse/60 hover:bg-text-inverse/10 dark:border-border-strong dark:text-text dark:hover:border-control dark:hover:bg-surface-sunken"
            >
              Post a brief
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
