import { ArrowRight, CheckCircle, Prohibit } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';

import { CategoryGrid } from '@/components/site/category-grid';
import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import {
  CONTAINER,
  HERO_SECTION,
  HeroFigure,
  PageCta,
  SECTION,
} from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';
import { getSessionUser } from '@/lib/supabase/session';
import { cn } from '@/lib/ui/cn';
import heroPhoto from '@/public/images/hero.jpg';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

/**
 * Home. The "Quiet ledger" direction (October 2026 redesign; DESIGN.md).
 *
 * Six sections, six layout families (taste-skill 4.7): a 7/5 split hero with a framed photo, a
 * category bento, a text-only row of steps under hairlines, a quoted example set large beside a
 * side note, definition rows for the principles, and an unboxed closing statement. One eyebrow,
 * in the hero (ceil(6 / 3) = 2 allowed). One theme throughout; one accent, used for the quote's
 * marks only.
 *
 * Removed in the redesign, as decoration that did no job (minimalist-ui): the scrolling skills
 * ticker, the example-match card laid over the hero photo (taste-skill bans overlays on images
 * and mocked-up product UI). The photos on the home steps came back in October 2026 at the
 * owner's request, shared with /how-it-works.
 *
 * CTA labels, one per intent, identical everywhere on the site: "Create a profile" (developer
 * sign-up), "Post a brief" (client sign-up), "Sign up" (the header's generic sign-up).
 *
 * Content history: "What a match looks like", "What it will not do" and the closing line come
 * from the landing page at b9fe7d4 (introduced in eb8bb6c). The headline was "Hired for the
 * work, not the keywords." until October 2026.
 *
 * Hero photo: Mahmudul Hasan, https://unsplash.com/photos/Mo08jadTWYc (Unsplash License),
 * graded to the site palette and cropped to 4:5.
 *
 * Signed-in visitors never see this page: the proxy sends them to their dashboard
 * (lib/supabase/route-policy.ts), and this re-checks in case the proxy was bypassed.
 */
const PRINCIPLES = [
  {
    title: 'Rank keywords over work',
    body: 'Someone who shipped the work outranks someone who listed the tool.',
  },
  {
    title: 'Hide anything behind AI',
    body: 'Search and filters find every job and every developer on their own.',
  },
  {
    title: 'Gatekeep who may list',
    body: 'Open to every developer. No fees, no approval queue, no middleman.',
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
          HERO_SECTION (components/site/page-parts.tsx): copy across 7 columns beside the framed
          photo across 5, filling the first screen so the next section starts below the fold.
          Every page intro shares it. Four text elements: eyebrow, headline (two lines from
          `sm`), subtext (20 words), actions. */}
      <section className={cn(CONTAINER, HERO_SECTION)}>
        <div className="animate-rise lg:col-span-7 lg:pr-8">
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
        </div>

        <HeroFigure
          src={heroPhoto}
          alt="A developer sketching app screens on a tablet with a stylus, beside a monitor"
        />
      </section>

      <CategoryGrid />

      {/* The steps sit on the sunken well: a tint within the same theme, not an inverted band. */}
      <div className="bg-surface-sunken">
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

      {/* ───────────── The differentiator, shown ─────────────
          A side note beside one quoted example, set large. The right column carries the content,
          so this is not the banned split header. Typographic quotes; no attribution because it
          is an example, and it says so. Stacked below `lg`. */}
      <section aria-labelledby="example-heading" className={cn(CONTAINER, SECTION)}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="reveal lg:col-span-4">
            <h2 id="example-heading" className="text-xl font-semibold tracking-tight">
              What a match looks like
            </h2>
            <p className="mt-4 max-w-[36ch] text-text-muted">
              This is an example. Every match carries a sentence like it, including where the fit
              falls short. When nothing fits, it says so.
            </p>
          </div>
          <blockquote
            style={{ '--i': 1 } as CSSProperties}
            className="reveal border-l-2 border-accent pl-6 text-display-sm font-medium text-text sm:pl-10 lg:col-span-8"
          >
            &ldquo;Has shipped this exact migration twice (Stripe Billing with proration and a
            historical-invoice backfill) and names the job that keeps it safe.&rdquo;
          </blockquote>
        </div>
      </section>

      {/* ───────────── Principles ─────────────
          Definition rows, divided by hairlines: the thing it will not do, then why. Title over
          body below `md`. No bottom padding: the closing statement below brings its own. */}
      <section aria-labelledby="principles-heading" className={CONTAINER}>
        <div className="reveal">
          <h2 id="principles-heading" className="text-display-sm">
            What it will not do
          </h2>
          <p className="mt-4 text-lg text-text-muted">
            No approval queue and nothing to qualify for.
          </p>
        </div>
        <dl className="mt-12 divide-y divide-border-base border-t border-border-base">
          {PRINCIPLES.map(({ title, body }, i) => (
            <div
              key={title}
              style={{ '--i': i } as CSSProperties}
              className="reveal grid gap-2 py-7 md:grid-cols-12 md:gap-8"
            >
              <dt className="flex items-center gap-3 text-xl font-medium tracking-tight md:col-span-5">
                <Prohibit aria-hidden="true" size={20} className="shrink-0 text-text-subtle" />
                {title}
              </dt>
              <dd className="text-text-muted md:col-span-7 md:pt-0.5">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <PageCta
        title="Show the work. Let the right people find it."
        primary={{ href: '/signup?role=talent', label: 'Create a profile' }}
        secondary={{ href: '/signup?role=client', label: 'Post a brief' }}
      />
    </>
  );
}
