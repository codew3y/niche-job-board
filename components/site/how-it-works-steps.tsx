import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';

import { CONTAINER, SECTION } from './page-parts';
import { cn } from '@/lib/ui/cn';
import pageSignUp from '@/public/images/how-it-works/page-01-sign-up.jpg';
import pageBuild from '@/public/images/how-it-works/page-02-build.jpg';
import pageMatched from '@/public/images/how-it-works/page-03-matched.jpg';
import pageWorking from '@/public/images/how-it-works/page-04-working.jpg';

/**
 * How It Works, as four steps. Used on the home page and, with a photo and a detail paragraph
 * per step, on /how-it-works.
 *
 * TWO COMPOSITIONS, so the page and the home section do not look alike:
 *   - home (showDetail false): a text-only row of four, each under a hairline, one column on
 *     phones, two from `sm`, four from `lg`. No photos: the home page already carries the hero
 *     photograph, and minimalist-ui keeps the rest of the page quiet;
 *   - /how-it-works (showDetail true): an asymmetric bento of framed photos, spans 7/5 then 5/7
 *     from `lg`, one column below `lg`.
 *
 * STATIC IMPORTS, so Next generates a tiny blurred preview of each photo at build time and inlines
 * it in the HTML (placeholder="blur").
 *
 * IMAGE SOURCES: Unsplash, downloaded into /public/images/how-it-works (not hotlinked), graded
 * to the site's palette (40% desaturated, slightly warm) and cropped to 4:3 at 1600px. Unsplash
 * License (https://unsplash.com/license): free to use, including commercially, no permission or
 * attribution required. Credited anyway:
 *   page-01-sign-up.jpg   Ilya Pavlov,        https://unsplash.com/photos/wbXdGS_D17U
 *   page-02-build.jpg     Kelly Sikkema,      https://unsplash.com/photos/hLit2zL-Dhk
 *   page-03-matched.jpg   Priscilla Du Preez, https://unsplash.com/photos/nNMBa7Y1Ymk
 *   page-04-working.jpg   Brooke Cagle,       https://unsplash.com/photos/tLG2hcpITZE
 */
export const STEPS = [
  {
    title: 'Sign up and pick a role',
    body: 'Create an account with Google, GitHub or email, then say whether you are here to find work or to hire. One account can hold both.',
    detail:
      'There is no approval queue and nothing to qualify for. Your role only decides which onboarding you see first. You can add the other side later in settings.',
    pageImage: pageSignUp,
    pageAlt: 'Hands typing on a white keyboard in front of a desktop computer',
  },
  {
    title: 'Build your profile or post a job',
    body: 'Developers describe what they have built: projects, links, photos and skills. Clients write the brief: what needs building and what done looks like.',
    detail:
      'You can publish a profile whenever you like, sparse or complete. A job has sections for the description, required and nice-to-have skills, budget and engagement type, and can be saved as a draft first.',
    pageImage: pageBuild,
    pageAlt: "A hand sketching an app's screens and the flow between them on paper",
  },
  {
    title: 'Get AI-matched',
    body: 'Matching reads the projects a developer describes and the brief a client writes, and ranks the fit both ways. Each match comes with one sentence saying why.',
    detail:
      'Hard requirements are filtered first. The closest profiles and briefs are then re-ranked with a written reason. If nothing fits, it says so rather than padding the list. Search and filters still find everyone without the AI.',
    pageImage: pageMatched,
    pageAlt: 'A hand pointing at something on a laptop screen while a colleague types',
  },
  {
    title: 'Connect and start working',
    body: 'Developers apply with a short note. Clients shortlist and message the people who fit. The rest is between the two of you.',
    detail:
      'Applications move through a visible timeline, and either side can message the other. TechSelect takes no fee and handles no payments. You agree terms, rates and contracts directly.',
    pageImage: pageWorking,
    pageAlt: 'Two people working through something together on one laptop at a wooden table',
  },
] as const;

/** Spans for the /how-it-works bento, from `lg`: 7/5, then 5/7. Four steps, four cells. */
const BENTO_SPANS = ['lg:col-span-7', 'lg:col-span-5', 'lg:col-span-5', 'lg:col-span-7'];

/** The stagger index for a list item's scroll entrance (globals.css `reveal`). */
const stagger = (i: number) => ({ '--i': i }) as CSSProperties;

export function HowItWorksSteps({
  heading = 'How it works',
  showDetail = false,
  headingLevel = 'h2',
  lead,
  footer,
}: {
  heading?: string;
  /** The /how-it-works page adds a photo and a longer paragraph to each step. */
  showDetail?: boolean;
  headingLevel?: 'h1' | 'h2';
  /** A lead paragraph under the heading. */
  lead?: string;
  footer?: ReactNode;
}) {
  const Heading = headingLevel;
  const StepHeading = headingLevel === 'h1' ? 'h2' : 'h3';

  return (
    <section aria-labelledby="how-heading" className={cn(CONTAINER, SECTION)}>
      <div className="reveal max-w-2xl">
        <Heading id="how-heading" className="text-display-sm">
          {heading}
        </Heading>
        {lead && <p className="mt-5 max-w-[60ch] text-lg text-text-muted">{lead}</p>}
      </div>

      {showDetail ? (
        <ol className="mt-12 grid gap-x-8 gap-y-14 lg:mt-16 lg:grid-cols-12">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              style={stagger(i % 2)}
              className={cn('reveal flex flex-col', BENTO_SPANS[i])}
            >
              {/* The nested frame is kept for photographs only (soft-skill double bezel). */}
              <div className="frame-tray">
                <div className="rounded-inner relative aspect-4/3 overflow-hidden bg-surface-sunken">
                  <Image
                    src={step.pageImage}
                    alt={step.pageAlt}
                    fill
                    sizes="(min-width: 1024px) 42rem, 100vw"
                    placeholder="blur"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="mt-6 flex items-baseline gap-4">
                <StepNumber n={i + 1} />
                <StepHeading className="text-2xl font-semibold tracking-tight">
                  {step.title}
                </StepHeading>
              </div>
              <div className="mt-3 max-w-[60ch] pl-10">
                <p className="text-text-muted">{step.body}</p>
                <p className="mt-3 text-sm text-text-subtle">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <ol className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              style={stagger(i)}
              className="reveal border-t border-border-strong pt-6"
            >
              <StepNumber n={i + 1} />
              <StepHeading className="mt-6 text-xl font-semibold tracking-tight">
                {step.title}
              </StepHeading>
              <p className="mt-3 text-text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      )}

      {footer}
    </section>
  );
}

/**
 * The step's position, in the mono face. Hidden from assistive tech: the <ol> already counts.
 * A plain numeral, not a "Step 1" label (taste-skill bans generic step labels).
 */
function StepNumber({ n }: { n: number }) {
  return (
    <span
      aria-hidden="true"
      className="w-6 shrink-0 font-mono text-sm text-text-subtle tabular-nums"
    >
      {n}
    </span>
  );
}
