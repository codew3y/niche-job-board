import Image from 'next/image';
import type { ReactNode } from 'react';

import { CONTAINER } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * How It Works, as four illustrated steps. Used on the home page and, with a detail paragraph
 * per step, on /how-it-works.
 *
 * TWO COMPOSITIONS, so the page and the home section do not look alike:
 *   - home (showDetail false): a staggered four-column rail, every second step dropped, one
 *     column below `sm`, two from `sm`, four from `lg`;
 *   - /how-it-works (showDetail true): an asymmetric bento, spans 7/5 then 5/7 from `lg`,
 *     one column below `lg`.
 *
 * ONE IMAGE, ONE PURPOSE. The home section and the /how-it-works page each have their own four
 * photos (`image` and `pageImage`), and no step photo is reused as a page header elsewhere.
 *
 * IMAGE SOURCES: all from Unsplash, downloaded into /public/images/how-it-works (not
 * hotlinked), cropped to 4:3 at 1200px. Unsplash License (https://unsplash.com/license): free to
 * use, including commercially, no permission or attribution required. Credited anyway:
 *   Home section
 *   01-sign-up.jpg        — KOBU Agency,        https://unsplash.com/photos/7okkFhxrxNw
 *   02-build-profile.jpg  — Nubelson Fernandes, https://unsplash.com/photos/UcYBL5V0xWQ
 *   03-get-matched.jpg    — Mohammad Rahmani,   https://unsplash.com/photos/8qEB0fTe9Vw
 *   04-start-working.jpg  — Compagnons,         https://unsplash.com/photos/Im_cQ6hQo10
 *   /how-it-works page
 *   page-01-sign-up.jpg   — Annie Spratt,       https://unsplash.com/photos/g9KFpAfQ5bc
 *   page-02-build.jpg     — Farzad,             https://unsplash.com/photos/p-xSl33Wxyc
 *   page-03-matched.jpg   — Cherrydeck,         https://unsplash.com/photos/UpsEF48wAgk
 *   page-04-working.jpg   — Max Andrey,         https://unsplash.com/photos/TlRQin0iwjE
 */
export const STEPS = [
  {
    title: 'Sign up and pick a role',
    body: 'Create an account with Google, GitHub or email, then say whether you are here to find work or to hire. One account can hold both.',
    detail:
      'There is no approval queue and nothing to qualify for. Your role only decides which onboarding you see first. You can add the other side later in settings.',
    image: '/images/how-it-works/01-sign-up.jpg',
    alt: 'Two people sitting at a desk looking at a website on a laptop',
    pageImage: '/images/how-it-works/page-01-sign-up.jpg',
    pageAlt: 'A woman at a desktop computer in a bright home office',
  },
  {
    title: 'Build your profile or post a job',
    body: 'Developers describe what they have built: projects, links, photos and skills. Clients write the brief: what needs building and what done looks like.',
    detail:
      'You can publish a profile whenever you like, sparse or complete. A job has sections for the description, required and nice-to-have skills, budget and engagement type, and can be saved as a draft first.',
    image: '/images/how-it-works/02-build-profile.jpg',
    alt: 'A hand typing on a laptop showing code, beside a mug and a potted plant',
    pageImage: '/images/how-it-works/page-02-build.jpg',
    pageAlt: 'Two monitors on a desk showing code in an editor',
  },
  {
    title: 'Get AI-matched',
    body: 'Matching reads the projects a developer describes and the brief a client writes, and ranks the fit both ways. Each match comes with one sentence saying why.',
    detail:
      'Hard requirements are filtered first. The closest profiles and briefs are then re-ranked with a written reason. If nothing fits, it says so rather than padding the list. Search and filters still find everyone without the AI.',
    image: '/images/how-it-works/03-get-matched.jpg',
    alt: 'A laptop screen showing lines of colourful code in a dark room',
    pageImage: '/images/how-it-works/page-03-matched.jpg',
    pageAlt: 'Four people around a table reviewing something on a laptop together',
  },
  {
    title: 'Connect and start working',
    body: 'Developers apply with a short note. Clients shortlist and message the people who fit. The rest is between the two of you.',
    detail:
      'Applications move through a visible timeline, and either side can message the other. TechSelect takes no fee and handles no payments. You agree terms, rates and contracts directly.',
    image: '/images/how-it-works/04-start-working.jpg',
    alt: 'Two developers working at computer monitors in a bright office',
    pageImage: '/images/how-it-works/page-04-working.jpg',
    pageAlt: 'A tidy home office desk with a monitor, laptop and keyboard, ready to work',
  },
] as const;

/** Spans for the /how-it-works bento, from `lg`: 7/5, then 5/7. Four steps, four cells. */
const BENTO_SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'];

export function HowItWorksSteps({
  heading = 'How it works',
  showDetail = false,
  headingLevel = 'h2',
  lead,
  footer,
}: {
  heading?: string;
  /** The /how-it-works page adds a longer paragraph under each step. */
  showDetail?: boolean;
  headingLevel?: 'h1' | 'h2';
  /** A lead paragraph under the heading (the /how-it-works page, where this is the intro). */
  lead?: string;
  footer?: ReactNode;
}) {
  const Heading = headingLevel;
  const StepHeading = headingLevel === 'h1' ? 'h2' : 'h3';
  const isPage = headingLevel === 'h1';

  return (
    <section
      aria-labelledby="how-heading"
      className={cn(CONTAINER, isPage ? 'pt-12 pb-12 sm:pt-16 lg:pt-20' : 'py-16 sm:py-24')}
    >
      <div className="max-w-2xl">
        <Heading
          id="how-heading"
          className={cn(isPage ? 'text-display-md' : 'text-display-sm', 'text-balance')}
        >
          {heading}
        </Heading>
        {lead && <p className="mt-5 text-lg text-text-muted text-pretty">{lead}</p>}
      </div>

      {showDetail ? (
        <ol className="mt-10 grid gap-5 lg:grid-cols-12">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className={cn(
                'flex flex-col overflow-hidden rounded-lg border border-border-base bg-surface-raised shadow-xs',
                BENTO_SPANS[i],
              )}
            >
              <div className="relative aspect-video bg-surface-sunken">
                <Image
                  src={step.pageImage}
                  alt={step.pageAlt}
                  fill
                  sizes="(min-width: 1024px) 700px, 100vw"
                  // The steps ARE the top of this page, so the first image is the Largest
                  // Contentful Paint and must not wait for lazy loading.
                  loading={i === 0 ? 'eager' : undefined}
                  fetchPriority={i === 0 ? 'high' : undefined}
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <StepNumber n={i + 1} />
                  <StepHeading className="text-xl font-semibold">{step.title}</StepHeading>
                </div>
                <p className="mt-3 text-text-muted text-pretty">{step.body}</p>
                <p className="mt-3 text-sm text-text-muted text-pretty">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            // Every second step drops on desktop: the row reads as a sequence, not a card shelf.
            <li key={step.title} className={cn('flex flex-col', i % 2 === 1 && 'lg:mt-14')}>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border-base bg-surface-sunken">
                <Image
                  src={step.image}
                  alt={step.alt}
                  fill
                  sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <StepNumber n={i + 1} />
                <StepHeading className="text-lg font-semibold">{step.title}</StepHeading>
              </div>
              <p className="mt-2 text-text-muted text-pretty">{step.body}</p>
            </li>
          ))}
        </ol>
      )}

      {footer}
    </section>
  );
}

/** The step's position, as a numeral tile. Hidden from assistive tech: the <ol> already counts. */
function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-subtle font-display text-sm font-semibold text-primary tabular-nums"
    >
      {n}
    </span>
  );
}
