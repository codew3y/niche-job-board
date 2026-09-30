import type { Metadata } from 'next';
import Link from 'next/link';

import { FeatureGrid, NumberedSteps, PageCta, PageIntro } from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'For Freelancers',
  description:
    'Build a profile around the work you have shipped, get matched to briefs that fit, and apply with the evidence.',
  alternates: { canonical: '/for-freelancers' },
};

/**
 * For Freelancers. The three steps are restored verbatim from the "For developers" column of the
 * old landing page (b9fe7d4). Everything else describes what the product actually does today —
 * see the profile editor (app/(dashboard)/dashboard/talent/profile) and ADR-008.
 */
const STEPS = [
  [
    'Describe what you built',
    'A headline, a bio and a couple of projects — or just a link to your site.',
  ],
  ['Get briefs that fit', 'Ranked against the work you have shipped, each with the reason.'],
  ['Apply with the evidence', 'Clients see the projects behind your note, not a keyword score.'],
] as const;

const PROFILE = [
  {
    title: 'Title and rate',
    body: 'Say what you do in one line and set an hourly rate in your currency. That line is how you appear everywhere: browse, messages and your public page.',
  },
  {
    title: 'Projects',
    body: 'Each project gets a title, a short description, as many links as it needs — repo, live site, write-up — and photos with descriptions for screen-reader users.',
  },
  {
    title: 'Skills from one shared list',
    body: 'Pick skills from a curated taxonomy of software, web and automation skills, so clients filtering for “Go” or “n8n” find you whatever you call it.',
  },
  {
    title: 'Experience and education',
    body: 'Roles with dates and a description, and the schools you studied at. Optional, and shown on your public profile when you add them.',
  },
  {
    title: 'Portfolio site and linked accounts',
    body: 'Link your own site, GitHub and LinkedIn. They appear as links on your profile — linked, never scraped.',
  },
  {
    title: 'Publish whenever you like',
    body: 'There is no bar to clear and no approval queue. A sparse profile publishes too; it simply ranks lower until there is more to read.',
  },
] as const;

const MATCHING = [
  {
    title: 'Matched on what you shipped',
    body: 'Your bio and project descriptions are what matching reads. Someone who shipped the work outranks someone who only listed the tool.',
  },
  {
    title: 'Your own score, and a reason',
    body: 'On your matches you see how well each brief fits you and one sentence explaining why — including where it falls short.',
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
        eyebrow="For freelancers"
        title="Get hired for what you have built"
        lead="techselect is a job board for software, web and automation work. Your profile is the work itself — projects, links and photos — and matching reads it to find briefs that actually fit."
      >
        <Link href="/signup?role=talent" className={buttonStyles({ size: 'lg' })}>
          Create your profile
        </Link>
        <Link href="/how-it-works" className="prose-link font-semibold">
          How it works
        </Link>
      </PageIntro>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h2 className="text-display-sm">Three steps</h2>
        <div className="mt-6 max-w-3xl">
          <NumberedSteps steps={STEPS} />
        </div>
      </section>

      <FeatureGrid heading="What goes into a profile" items={PROFILE} />
      <FeatureGrid heading="How you get matched" items={MATCHING} />

      <PageCta
        title="No fees and nothing to qualify for. Start with a title and one project."
        primary={{ href: '/signup?role=talent', label: 'Sign up as a freelancer' }}
        secondary={{ href: '/for-clients', label: 'Hiring instead?' }}
      />
    </>
  );
}
