import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * How It Works, as four illustrated steps. Used on the home page and, with a detail paragraph
 * per step, on /how-it-works.
 *
 * IMAGE SOURCES — all from Unsplash, downloaded into /public/images/how-it-works (not
 * hotlinked), cropped to 4:3 at 1200px. Unsplash License (https://unsplash.com/license): free to
 * use, including commercially, no permission or attribution required. Credited anyway:
 *   01-sign-up.jpg        — KOBU Agency,        https://unsplash.com/photos/7okkFhxrxNw
 *   02-build-profile.jpg  — Nubelson Fernandes, https://unsplash.com/photos/UcYBL5V0xWQ
 *   03-get-matched.jpg    — Mohammad Rahmani,   https://unsplash.com/photos/8qEB0fTe9Vw
 *   04-start-working.jpg  — Compagnons,         https://unsplash.com/photos/Im_cQ6hQo10
 */
export const STEPS = [
  {
    title: 'Sign up and pick a role',
    body: 'Create an account with Google, GitHub or email, then say whether you are here to find work or to hire. One account can hold both.',
    detail:
      'There is no approval queue and nothing to qualify for. Choosing a role only decides which onboarding you see first; you can add the other side later from settings.',
    image: '/images/how-it-works/01-sign-up.jpg',
    alt: 'Two people sitting at a desk looking at a website on a laptop',
  },
  {
    title: 'Build your profile or post a job',
    body: 'Developers describe what they have built — projects, links, photos, skills. Clients write the brief: what needs building and what done looks like.',
    detail:
      'A profile can be published whenever you like, sparse or complete. A job is written in sections — description, required and nice-to-have skills, budget, engagement type — and can be saved as a draft first.',
    image: '/images/how-it-works/02-build-profile.jpg',
    alt: 'A hand typing on a laptop showing code, beside a mug and a potted plant',
  },
  {
    title: 'Get AI-matched',
    body: 'Matching reads the projects a developer describes and the brief a client writes, and ranks the fit in both directions — each match with one sentence saying why.',
    detail:
      'Hard requirements are filtered first, then the closest profiles and briefs are re-ranked with a written reason. If nothing fits, it says so rather than padding the list. Search and filters still find everyone without the AI.',
    image: '/images/how-it-works/03-get-matched.jpg',
    alt: 'A laptop screen showing lines of colourful code in a dark room',
  },
  {
    title: 'Connect and start working',
    body: 'Developers apply with a short note; clients shortlist and message the people who fit. The rest is between the two of you.',
    detail:
      'Applications move through a visible timeline, and either side can message the other. techselect takes no fee and handles no payments — terms, rates and contracts are agreed directly.',
    image: '/images/how-it-works/04-start-working.jpg',
    alt: 'Two developers working at computer monitors in a bright office',
  },
] as const;

export function HowItWorksSteps({
  heading = 'How it works',
  showDetail = false,
  headingLevel = 'h2',
  footer,
}: {
  heading?: string;
  /** The /how-it-works page adds a longer paragraph under each step. */
  showDetail?: boolean;
  headingLevel?: 'h1' | 'h2';
  footer?: ReactNode;
}) {
  const Heading = headingLevel;
  const StepHeading = headingLevel === 'h1' ? 'h2' : 'h3';

  return (
    <section
      aria-labelledby="how-heading"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <Heading
        id="how-heading"
        className={
          headingLevel === 'h1' ? 'text-display-md text-balance' : 'text-display-sm text-balance'
        }
      >
        {heading}
      </Heading>

      <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-border-base bg-surface-sunken">
              <Image
                src={step.image}
                alt={step.alt}
                fill
                sizes="(min-width: 1024px) 270px, (min-width: 640px) 45vw, 100vw"
                // On /how-it-works the steps ARE the top of the page, so the first image is the
                // Largest Contentful Paint and must not wait for lazy loading. On the home page
                // the section is below the fold and stays lazy.
                loading={headingLevel === 'h1' && i === 0 ? 'eager' : undefined}
                fetchPriority={headingLevel === 'h1' && i === 0 ? 'high' : undefined}
                className="object-cover"
              />
            </div>
            <p className="mt-4 text-sm font-semibold text-accent tabular-nums">Step {i + 1}</p>
            <StepHeading className="mt-1 text-lg font-semibold">{step.title}</StepHeading>
            <p className="mt-2 text-text-muted text-pretty">{step.body}</p>
            {showDetail && (
              <p className="mt-3 text-sm text-text-muted text-pretty">{step.detail}</p>
            )}
          </li>
        ))}
      </ol>

      {footer}
    </section>
  );
}
