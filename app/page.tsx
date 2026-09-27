import { ArrowRight, ArrowUpRight, BadgeCheck, Quote, Search, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { HeroVideo } from '@/components/marketing/hero-video';
import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';
import { getSessionProfile } from '@/lib/supabase/session';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * The front door — the Editorial direction (DESIGN.md §3).
 *
 * SESSION-AWARE, because a previous version was not and that was a real defect: a signed-in
 * user who clicked the logo landed on a page inviting them to "Get started", as though the
 * product had forgotten them.
 *
 * The role is asked BEFORE the account, not after — "I'm looking for work" / "I'm hiring" are
 * the first two actions, modelled on Upwork. Each appears exactly once on the page: the closing
 * band uses different words ("Create a profile", "Post a brief") so a second copy of the same
 * link never competes with the first (e2e/role-first.spec.ts would call that ambiguous, and it
 * would be right).
 *
 * The copy avoids the positioning ADR-008 removed — anyone may list; evidence helps rather than
 * admits.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  // Where a deleted account lands. Signing someone out onto a marketing page with no
  // acknowledgement reads as a failure, not a completion.
  const deleted = (await searchParams).deleted === '1';

  // Cached per request, so the header and this page share one lookup rather than two.
  const profile = await getSessionProfile();
  const displayName = profile?.displayName ?? null;
  // Somebody mid-onboarding has no role profile yet; send them to finish rather than into a
  // dashboard that would bounce them straight back out.
  const dashboard = profile
    ? profile.hasTalent || profile.hasClient
      ? profile.activeRole === 'client'
        ? '/dashboard/client'
        : '/dashboard/talent'
      : '/select-role'
    : null;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader dashboard={dashboard} />

      <main id="main" className="flex-1">
        {deleted && (
          <div className="gutter mx-auto max-w-6xl pt-6">
            <p
              role="status"
              className="rounded-lg border border-border-base bg-surface-raised px-5 py-4 text-sm text-text-muted text-pretty"
            >
              <strong className="font-medium text-text">Your account has been deleted.</strong>{' '}
              Anything you posted is gone; conversations you were part of survive with your side
              removed, as the privacy policy sets out.
            </p>
          </div>
        )}

        {/* ───────────── Hero ───────────── */}
        <section className="gutter mx-auto grid max-w-6xl gap-10 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.08fr_1fr] lg:gap-16 lg:pt-20 lg:pb-24">
          <div className="flex flex-col justify-center">
            <p className="animate-rise text-xs font-medium tracking-eyebrow text-accent uppercase">
              A job board for software, web &amp; automation work
            </p>
            <h1 className="animate-rise mt-5 font-serif text-display-lg text-balance [animation-delay:60ms]">
              Hired for the work, <em className="text-accent not-italic">not</em> the keywords.
            </h1>
            <p className="animate-rise mt-6 max-w-lg text-lg text-text-muted [animation-delay:120ms]">
              Matching reads the projects you describe and the brief a client writes, then says in
              one sentence why they fit — or that nothing does.
            </p>

            <div className="animate-rise mt-9 flex flex-wrap items-center gap-x-6 gap-y-4 [animation-delay:180ms]">
              {dashboard ? (
                <>
                  <Link href={dashboard} className={buttonStyles({ size: 'lg' })}>
                    {displayName
                      ? `Continue as ${displayName.split(' ')[0]}`
                      : 'Go to your dashboard'}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                  <Link href="/jobs" className="prose-link font-medium">
                    Browse jobs
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup?role=talent" className={buttonStyles({ size: 'lg' })}>
                    I&rsquo;m looking for work
                  </Link>
                  <Link
                    href="/signup?role=client"
                    className="group inline-flex items-center gap-1.5 text-base font-medium"
                  >
                    <span className="prose-link">I&rsquo;m hiring</span>
                    <ArrowUpRight
                      aria-hidden="true"
                      size={18}
                      className="transition-transform duration-fast ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </>
              )}
            </div>

            {/* ADR-008, said on the front page rather than discovered after signing up. */}
            {!dashboard && (
              <p className="animate-rise mt-8 max-w-lg border-t border-border-base pt-5 text-sm text-text-subtle [animation-delay:240ms]">
                No approval queue and nothing to qualify for. You can also{' '}
                <Link href="/jobs" className="prose-link text-text">
                  browse without an account
                </Link>
                .
              </p>
            )}
          </div>

          <figure className="animate-rise [animation-delay:120ms]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-sunken sm:aspect-[16/11] lg:aspect-[4/5]">
              <HeroVideo
                poster="/video/hero-poster.jpg"
                webm="/video/hero.webm"
                mp4="/video/hero.mp4"
                label="a developer writing code at a laptop"
              />
              {/* Scrim under the caption: the footage is busy at the bottom (a keyboard), so the
                  gradient guarantees the caption's contrast whatever frame is showing. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-scrim to-transparent"
              />
              <p className="absolute bottom-5 left-5 max-w-[65%] text-sm text-media-surface/90">
                The work itself, not a list of keywords about it.
              </p>
            </div>
          </figure>
        </section>

        {/* ───────────── The differentiator, shown ───────────── */}
        <section
          aria-labelledby="example-heading"
          className="border-y border-border-base bg-surface-sunken"
        >
          <div className="gutter mx-auto max-w-4xl py-20 text-center sm:py-24">
            <p
              id="example-heading"
              className="text-xs font-medium tracking-eyebrow text-text-subtle uppercase"
            >
              What a match looks like — an example
            </p>
            <Quote aria-hidden="true" className="mx-auto mt-8 size-8 text-accent" />
            <blockquote className="mt-4 font-serif text-display-md text-balance">
              Has shipped this exact migration twice — Stripe Billing with proration and a
              historical-invoice backfill — and names the job that keeps it safe.
            </blockquote>
            <p className="mx-auto mt-6 max-w-md text-sm text-text-muted">
              Every match carries a sentence like this, including where it falls short. When nothing
              fits, it says so instead of padding the list.
            </p>
          </div>
        </section>

        {/* ───────────── How it works ───────────── */}
        <section aria-labelledby="how-heading" className="gutter mx-auto max-w-6xl py-20 sm:py-24">
          <h2 id="how-heading" className="sr-only">
            How it works
          </h2>
          <div className="grid gap-16 md:grid-cols-2">
            {(
              [
                [
                  'For developers',
                  [
                    [
                      'Describe what you built',
                      'A headline, a bio and a couple of projects — or just a link to your site.',
                    ],
                    [
                      'Get briefs that fit',
                      'Ranked against the work you have shipped, each with the reason.',
                    ],
                    [
                      'Apply with the evidence',
                      'Clients see the projects behind your note, not a keyword score.',
                    ],
                  ],
                ],
                [
                  'For clients',
                  [
                    [
                      'Write the brief',
                      'What needs building and what done looks like. Matching reads it closely.',
                    ],
                    [
                      'See who fits',
                      'Applicants ordered by fit, plus developers who fit and have not applied yet.',
                    ],
                    [
                      'Decide for yourself',
                      'An order and a sentence of reasoning — never a number on a person.',
                    ],
                  ],
                ],
              ] as const
            ).map(([heading, steps]) => (
              <div key={heading}>
                <h3 className="font-serif text-display-sm">{heading}</h3>
                <ol className="mt-8 divide-y divide-border-base border-y border-border-base">
                  {steps.map(([title, body], i) => (
                    <li key={title} className="grid grid-cols-[2.75rem_1fr] gap-4 py-5">
                      <span className="font-serif text-2xl text-accent tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div>
                        <p className="font-medium">{title}</p>
                        <p className="mt-1 text-text-muted">{body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* ───────────── Principles ───────────── */}
        <section
          aria-labelledby="principles-heading"
          className="gutter mx-auto max-w-6xl pb-20 sm:pb-24"
        >
          <h2 id="principles-heading" className="font-serif text-display-sm">
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
                <p className="mt-4 font-medium">{title}</p>
                <p className="mt-1.5 text-sm text-text-muted">{body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ───────────── Closing band ───────────── */}
        {!dashboard && (
          <section className="gutter mx-auto mb-20 max-w-6xl">
            <div className="rounded-2xl bg-surface-inverse px-6 py-14 text-center text-text-inverse sm:px-12">
              <p className="mx-auto max-w-2xl font-serif text-display-md text-balance">
                Show the work. Let the right people find it.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/signup?role=talent"
                  className={cn(buttonStyles({ variant: 'accent', size: 'lg' }))}
                >
                  Create a profile
                </Link>
                <Link
                  href="/signup?role=client"
                  className={cn(
                    buttonStyles({ variant: 'secondary', size: 'lg' }),
                    'border-text-inverse/30 bg-transparent text-text-inverse hover:border-text-inverse/60 hover:bg-text-inverse/10',
                  )}
                >
                  Post a brief
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
