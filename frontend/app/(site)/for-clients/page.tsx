import type { Metadata } from 'next';
import Link from 'next/link';

import {
  BookmarkSimple,
  HandCoins,
  ListNumbers,
  MagnifyingGlass,
  Sparkle,
  UsersThree,
} from '@phosphor-icons/react/ssr';

import { DevelopersShowcase } from '@/components/site/board-showcase';
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
import stepBrief from '@/public/images/steps/clients-01-brief.jpg';
import stepDecide from '@/public/images/steps/clients-03-decide.jpg';
import stepFit from '@/public/images/steps/clients-02-fit.jpg';

/** Pre-built and cached; rebuilt at most every 5 minutes for the live board panel. */
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Clients',
  description:
    'Post a brief for software, web or automation work and see developers ordered by fit, each with a reason.',
  alternates: { canonical: '/for-clients' },
};

/**
 * For Clients. The three steps come from the "For clients" column of the old landing page
 * (b9fe7d4). The rest describes the job form, the candidate list (the score-asymmetry rule:
 * order and reason, never a number on a person) and the terms (no fee, no payments).
 *
 * Five sections, five layout families: split intro beside the live board (listed developers),
 * steps with photographs, side-heading list, icon cards, closing panel. One eyebrow (the intro).
 *
 * STEP PHOTOS: Unsplash License, graded to the site palette, cropped to 4:3.
 *   clients-01-brief.jpg   Carter Hightower,         https://unsplash.com/photos/4GD9RphwnZA
 *   clients-02-fit.jpg     LinkedIn Sales Solutions, https://unsplash.com/photos/YDVdprpgHv4
 *   clients-03-decide.jpg  Mina Rad,                 https://unsplash.com/photos/qFSQFSmfZkA
 */
const STEP_IMAGES = [
  { src: stepBrief, alt: 'Someone writing notes in a notebook beside an open laptop' },
  { src: stepFit, alt: 'Two people looking at a laptop together, one pointing at the screen' },
  { src: stepDecide, alt: 'Two people shaking hands across a desk' },
] as const;
const STEPS = [
  ['Write the brief', 'What needs building and what done looks like. Matching reads it closely.'],
  ['See who fits', 'Applicants ordered by fit, plus developers who fit and have not applied yet.'],
  ['Decide for yourself', 'An order and a sentence of reasoning, never a number on a person.'],
] as const;

const POSTING = [
  {
    title: 'A brief in four sections',
    body: 'Describe the work, then list required and nice-to-have skills from the shared skill list, set a budget range and currency, and choose fixed, hourly or retainer.',
  },
  {
    title: 'Draft, publish, edit, close',
    body: 'Save a job as a draft until it is ready. Published jobs have a public page anyone can open from a link; close or reopen it whenever you need to.',
  },
  {
    title: 'No company needed',
    body: 'Hire as yourself or for a business. The name you choose, plus an optional website and a line about the work, appears on every job you post.',
  },
] as const;

const FINDING: Feature[] = [
  {
    title: 'Candidates in order, with a reason',
    icon: ListNumbers,
    body: 'Applicants are ranked against your brief, and each carries one sentence saying why they fit. You see the order and the reasoning, never a numeric score.',
  },
  {
    title: 'Suggested developers',
    icon: Sparkle,
    body: 'Developers who fit the brief but have not applied yet are suggested alongside, so a good match is not missed because they did not see the post.',
  },
  {
    title: 'Browse and search without AI',
    icon: MagnifyingGlass,
    body: 'Search and filters by skill, availability and rate find every listed developer on their own. The matching is help, not a gate.',
  },
  {
    title: 'Shortlist and message',
    icon: BookmarkSimple,
    body: 'Move applications through shortlisted or not a fit, and message developers directly. Save the ones you want to come back to.',
  },
  {
    title: 'Everyone who wants to be listed is listed',
    icon: UsersThree,
    body: 'There is no approval queue for developers either. Judge them on the projects and links they show.',
  },
  {
    title: 'No fees, no middleman',
    icon: HandCoins,
    body: 'TechSelect takes no fee and handles no payments. Terms, rates and contracts are agreed directly between you and the developer.',
  },
];

export default function ForClientsPage() {
  return (
    <>
      <PageIntro
        eyebrow="Clients"
        title="Find developers by what they have shipped"
        lead="Post a brief for software, web or automation work. See who fits, in order, and why."
        aside={<DevelopersShowcase />}
      >
        <Link href="/signup?role=client" className={buttonStyles({ size: 'lg' })}>
          Post a brief
        </Link>
        <Link href="/how-it-works" className={buttonStyles({ variant: 'secondary', size: 'lg' })}>
          How it works
        </Link>
      </PageIntro>

      <Band>
        <NumberedSteps heading="Three steps to a shortlist" steps={STEPS} images={STEP_IMAGES} />
      </Band>
      <FeatureList
        heading="Posting a job"
        lead="A job is a brief you can draft, publish, edit and close whenever you need to."
        items={POSTING}
      />
      <Band>
        <FeatureCards
          heading="Finding the right person"
          lead="Matching does the first read. You make every decision."
          items={FINDING}
        />
      </Band>

      <PageCta
        title="Write the brief once. See who fits, in order, with a reason for each."
        primary={{ href: '/signup?role=client', label: 'Post a brief' }}
        secondary={{ href: '/for-freelancers', label: 'Looking for work instead?' }}
      />
    </>
  );
}
