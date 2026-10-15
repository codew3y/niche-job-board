import type { Metadata } from 'next';
import Link from 'next/link';

import {
  Certificate,
  CurrencyCircleDollar,
  Kanban,
  LinkSimple,
  RocketLaunch,
  Tag,
} from '@phosphor-icons/react/ssr';

import { BriefsShowcase } from '@/components/site/board-showcase';
import {
  Band,
  FeatureCards,
  FeatureList,
  NumberedSteps,
  PageCta,
  PageIntro,
  type Feature,
} from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';
import stepApply from '@/public/images/steps/freelancers-03-apply.jpg';
import stepBriefs from '@/public/images/steps/freelancers-02-briefs.jpg';
import stepDescribe from '@/public/images/steps/freelancers-01-describe.jpg';

export const metadata: Metadata = {
  title: 'Freelancers',
  description:
    'Build a profile around the work you have shipped, get matched to briefs that fit, and apply with the evidence.',
  alternates: { canonical: '/for-freelancers' },
};

/**
 * For Freelancers. The three steps come from the "For developers" column of the old landing
 * page (b9fe7d4). Everything else describes what the product actually does today: see the
 * profile editor (frontend/app/(dashboard)/dashboard/talent/profile) and the no-publish-gate decision.
 *
 * Five sections, five layout families: split intro beside the live board (open briefs), steps
 * with photographs, icon cards, side-heading list, closing panel. One eyebrow (the intro).
 *
 * STEP PHOTOS: Unsplash License, graded to the site palette, cropped to 4:3.
 *   freelancers-01-describe.jpg  Christin Hume,  https://unsplash.com/photos/Hcfwew744z4
 *   freelancers-02-briefs.jpg    fran innocenti, https://unsplash.com/photos/ij8xP91j8jM
 *   freelancers-03-apply.jpg     Vitaly Gariev,  https://unsplash.com/photos/irfWcn-sF48
 */
const STEP_IMAGES = [
  { src: stepDescribe, alt: 'Hands typing on a laptop at a wooden desk' },
  {
    src: stepBriefs,
    alt: 'A developer reading through a list on a laptop in a busy shared office',
  },
  { src: stepApply, alt: 'Two people going over work together at a laptop' },
] as const;
const STEPS = [
  [
    'Describe what you built',
    'A headline, a bio and a couple of projects. Or just a link to your site.',
  ],
  ['Get briefs that fit', 'Ranked against the work you have shipped, each with the reason.'],
  ['Apply with the evidence', 'Clients see the projects behind your note, not a keyword score.'],
] as const;

const PROFILE: Feature[] = [
  {
    title: 'Title and rate',
    icon: CurrencyCircleDollar,
    body: 'Say what you do in one line and set an hourly rate in your currency. That line is how you appear everywhere: browse, messages and your public page.',
  },
  {
    title: 'Projects',
    icon: Kanban,
    body: 'Each project gets a title, a short description, as many links as it needs (repo, live site, write-up) and photos with descriptions for screen-reader users.',
  },
  {
    title: 'Skills from one shared list',
    icon: Tag,
    body: 'Pick skills from a curated taxonomy of software, web and automation skills, so clients filtering for “Go” or “n8n” find you whatever you call it.',
  },
  {
    title: 'Experience and education',
    icon: Certificate,
    body: 'Roles with dates and a description, and the schools you studied at. Optional, and shown on your public profile when you add them.',
  },
  {
    title: 'Portfolio site and linked accounts',
    icon: LinkSimple,
    body: 'Link your own site, GitHub and LinkedIn. They appear as links on your profile. We link to them and never scrape them.',
  },
  {
    title: 'Publish whenever you like',
    icon: RocketLaunch,
    body: 'There is no bar to clear and no approval queue. A sparse profile publishes too; it simply ranks lower until there is more to read.',
  },
];

const MATCHING = [
  {
    title: 'Matched on what you shipped',
    body: 'Your bio and project descriptions are what matching reads. Someone who shipped the work outranks someone who only listed the tool.',
  },
  {
    title: 'Your own score, and a reason',
    body: 'On your matches you see how well each brief fits you and one sentence explaining why, including where it falls short.',
  },
  {
    title: 'Apply, track, message',
    body: 'Apply with a short note. Your applications show where each one stands, and clients can message you directly if you accept messages.',
  },
] as const;

export default function ForFreelancersPage() {
  return (
    <>
      <PageIntro
        eyebrow="Freelancers"
        title="Get hired for what you have built"
        lead="Your profile is the work itself: projects, links and photos. Matching reads it to find briefs that fit."
        aside={<BriefsShowcase />}
      >
        <Link href="/signup?role=talent" className={buttonStyles({ size: 'lg' })}>
          Create a profile
        </Link>
        <Link href="/how-it-works" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
          How it works
        </Link>
      </PageIntro>

      <Band>
        <NumberedSteps
          heading="Three steps to your first match"
          steps={STEPS}
          images={STEP_IMAGES}
        />
      </Band>
      <FeatureCards
        heading="What goes into a profile"
        lead="Everything a client reads before they message you. Only a title and one project are needed to start."
        items={PROFILE}
      />
      <Band>
        <FeatureList
          heading="How you get matched"
          lead="Matching reads what you wrote about your work, not a list of keywords."
          items={MATCHING}
        />
      </Band>

      <PageCta
        title="No fees and nothing to qualify for. Start with a title and one project."
        primary={{ href: '/signup?role=talent', label: 'Create a profile' }}
        secondary={{ href: '/for-clients', label: 'Hiring instead?' }}
      />
    </>
  );
}
