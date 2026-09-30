import type { Metadata } from 'next';

import { HowItWorksSteps } from '@/components/site/how-it-works-steps';
import { FeatureList, FeatureRows, PageCta } from '@/components/site/page-parts';

export const metadata: Metadata = {
  title: 'How It Works',
  description:
    'Sign up and pick a role, build a profile or post a job, get AI-matched with a reason for every match, then connect and start working.',
  alternates: { canonical: '/how-it-works' },
};

/**
 * How It Works: the full version of the home page section, the same four illustrated steps
 * with a longer paragraph each, laid out as an image bento.
 *
 * The three principles come from the landing page before the Editorial redesign (6a11f96),
 * where they sat under the hero.
 *
 * Four sections, four layout families: image bento (with the h1 and lead), side-heading list,
 * definition rows, closing panel. No eyebrows.
 */
const PRINCIPLES = [
  {
    title: 'Evidence, not keywords',
    body: 'Matching reads your bio and the projects you describe. Someone who has shipped the work outranks someone who listed the tool.',
  },
  {
    title: 'A reason, every time',
    body: 'Every match carries one sentence saying why. If nothing fits, it says that instead of padding the list.',
  },
  {
    title: 'Both directions',
    body: 'Clients see ranked candidates for a brief. Developers see briefs that fit what they have built.',
  },
] as const;

const DETAILS = [
  {
    title: 'What the matching reads',
    body: 'Profile titles and bios, project descriptions and outcomes, skills, and the full text of a brief. It does not read linked websites, because a link is not text it can match on.',
  },
  {
    title: 'Where it runs',
    body: 'Both steps (finding the closest profiles and briefs, then writing the reason) run on Google’s Gemini API. The privacy policy sets out exactly what is sent.',
  },
  {
    title: 'What it never decides',
    body: 'Who may list, and who gets hired. Clients see an order and a reason, never a score on a person. The choice is always theirs.',
  },
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <HowItWorksSteps
        heading="How TechSelect works"
        lead="Four steps from sign-up to working together. No approval queue, no fees."
        headingLevel="h1"
        showDetail
      />
      <FeatureList heading="The three ideas behind it" items={PRINCIPLES} />
      <FeatureRows heading="About the matching" items={DETAILS} />
      <PageCta
        title="Signing up takes a minute with Google or GitHub."
        primary={{ href: '/signup', label: 'Sign up' }}
        secondary={{ href: '/about', label: 'About TechSelect' }}
      />
    </>
  );
}
