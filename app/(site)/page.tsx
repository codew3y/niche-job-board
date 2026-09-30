import { ArrowRight, BadgeCheck, CircleCheck, Quote, Search, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CategoryGrid } from '@/components/site/category-grid';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { CONTAINER, PageCta } from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@/lib/supabase/session';
import { cn } from '@/lib/ui/cn';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Home.
 *
 * Six sections, six layout families (taste-skill 4.7): an asymmetric split hero with the real
 * video, a tile grid of categories, a staggered image rail for the steps, a quoted example
 * match, a side-heading principles list, and a closing panel. One theme throughout: the old
 * inverse closing band is gone (4.11). One eyebrow, in the hero (4.7, ceil(6 / 3) = 2 allowed).
 *
 * CTA labels, one per intent, identical everywhere on the site: "Create a profile" (developer
 * sign-up), "Post a brief" (client sign-up), "Sign up" (the header's generic sign-up).
 *
 * Content history: the hero line, "What a match looks like", "What it will not do" and the
 * closing line come from the landing page at b9fe7d4 (introduced in eb8bb6c).
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
        <div className={cn(CONTAINER, 'pt-6')}>
          <p
            role="status"
            className="flex items-start gap-3 rounded-lg border border-border-base bg-success-subtle px-5 py-4 text-sm text-text-muted text-pretty"
          >
            <CircleCheck aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
            <span>
              <strong className="font-semibold text-text">Your account has been deleted.</strong>{' '}
              Anything you posted is gone. Conversations you were part of stay, with your side
              removed, as the privacy policy sets out.
            </span>
          </p>
        </div>
      )}

      {/* ───────────── Hero ─────────────
          Asymmetric split: copy (1fr) beside the video (1.15fr, wider, so it reads as
          landscape). Both columns stretch to the same height from `lg`; below `lg` the copy
          stacks over a 16:9 video.

          It fills the first screen (viewport minus the 4rem header, its 1px border and any notch
          inset), so the next section starts below the fold. From `lg` the row stretches and the
          video grows to fill that height, rather than the copy floating in empty padding
          (taste-skill hero top-padding cap); the copy centres beside it. svh, not
          dvh: the height must not jump as a phone's browser bar shows and hides.

          The headline is display-md up to `xl` and display-lg from `xl`, where the copy column
          is wide enough to hold it on two lines. Four text elements: eyebrow, headline,
          subtext (20 words), actions. */}
      <section
        className={cn(
          CONTAINER,
          'grid min-h-[calc(100svh-4rem-1px-env(safe-area-inset-top,0px))] content-center gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1.15fr] lg:content-stretch lg:items-stretch lg:gap-12 lg:py-12',
        )}
      >
        <div className="flex flex-col justify-center animate-rise">
          <p className="text-sm font-semibold text-link">Software, web and automation work</p>
          <h1 className="mt-4 text-display-md text-balance sm:text-display-lg lg:text-display-md xl:text-display-lg">
            Hired for the work, not the keywords.
          </h1>
          <p className="mt-6 max-w-lg text-lg text-text-muted text-pretty">
            Matching reads the projects you describe and the brief a client writes, then says in one
            sentence why they fit.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
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
        </div>

        {/* The hero figure: a still photo of a developer at work, supplied by the owner
            (public/images/hero.jpg, AI-generated with Google Gemini). It is the LCP element, so
            it is preloaded. The crop favours the right of the frame, where the screen of code
            sits, because the figure is taller than the photo from `lg`. */}
        <figure
          className="relative aspect-video overflow-hidden rounded-lg border border-border-base bg-surface-sunken shadow-lg animate-rise lg:aspect-auto lg:h-full lg:min-h-80"
          style={{ animationDelay: '80ms' }}
        >
          <Image
            src="/images/hero.jpg"
            alt="A developer in headphones writing code at a desk at night"
            fill
            preload
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover object-[62%_50%]"
          />
        </figure>
      </section>

      <CategoryGrid />

      <div className="border-y border-border-base bg-surface-raised">
        <HowItWorksSteps
          footer={
            <Link
              href="/how-it-works"
              className="prose-link mt-10 inline-flex min-h-10 items-center font-semibold"
            >
              More on how it works
            </Link>
          }
        />
      </div>

      {/* ───────────── The differentiator, shown ─────────────
          A single quoted example on a tinted panel, left-aligned. Typographic quotes, no
          attribution because it is an example, and it says so. */}
      <section aria-labelledby="example-heading" className={cn(CONTAINER, 'py-16 sm:py-24')}>
        <div className="grid gap-8 rounded-lg bg-primary-subtle px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[auto_1fr] md:gap-10">
          <Quote aria-hidden="true" className="size-10 text-primary" />
          <div className="max-w-3xl">
            <h2 id="example-heading" className="text-xl font-semibold">
              What a match looks like
            </h2>
            <blockquote className="mt-5 font-display text-2xl font-medium text-balance text-text sm:text-display-sm sm:font-medium">
              &ldquo;Has shipped this exact migration twice (Stripe Billing with proration and a
              historical-invoice backfill) and names the job that keeps it safe.&rdquo;
            </blockquote>
            <p className="mt-6 max-w-xl text-text-muted text-pretty">
              This is an example. Every match carries a sentence like it, including where the fit
              falls short. When nothing fits, it says so.
            </p>
          </div>
        </div>
      </section>

      {/* ───────────── Principles ─────────────
          Side heading, stacked rows beside it. Stacked below `lg`. */}
      <section aria-labelledby="principles-heading" className={cn(CONTAINER, 'pb-16 sm:pb-24')}>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
          <div>
            <h2 id="principles-heading" className="text-display-sm text-balance">
              What it will not do
            </h2>
            <p className="mt-4 max-w-sm text-text-muted text-pretty">
              No approval queue and nothing to qualify for.
            </p>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-lg border border-border-base bg-border-base">
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
              <li key={title} className="flex gap-4 bg-surface-raised p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-subtle text-link">
                  <Icon aria-hidden="true" size={20} />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-text-muted text-pretty">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PageCta
        title="Show the work. Let the right people find it."
        primary={{ href: '/signup?role=talent', label: 'Create a profile' }}
        secondary={{ href: '/signup?role=client', label: 'Post a brief' }}
      />
    </>
  );
}
