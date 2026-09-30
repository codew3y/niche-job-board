import type { Metadata } from 'next';
import Link from 'next/link';

import { FeatureGrid, NumberedSteps, PageCta, PageIntro } from '@/components/site/page-parts';
import { buttonStyles } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'For Clients',
  description:
    'Post a brief for software, web or automation work and see developers ordered by fit, each with a reason.',
  alternates: { canonical: '/for-clients' },
};

/**
 * For Clients. The three steps are restored verbatim from the "For clients" column of the old
 * landing page (b9fe7d4). The rest describes the job form, the candidate list (ADR-007 D2:
 * order and reason, never a number on a person) and the terms (no fee, no payments).
 */
const STEPS = [
  ['Write the brief', 'What needs building and what done looks like. Matching reads it closely.'],
  ['See who fits', 'Applicants ordered by fit, plus developers who fit and have not applied yet.'],
  ['Decide for yourself', 'An order and a sentence of reasoning — never a number on a person.'],
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
    title: 'Your company profile',
    body: 'The company name, website and a short description appear on every job you post — the context a developer reads before applying.',
  },
] as const;

const FINDING = [
  {
    title: 'Candidates in order, with a reason',
    body: 'Applicants are ranked against your brief, and each carries one sentence saying why they fit. You see the order and the reasoning — never a numeric score.',
  },
  {
    title: 'Suggested developers',
    body: 'Developers who fit the brief but have not applied yet are suggested alongside, so a good match is not missed because they did not see the post.',
  },
  {
    title: 'Browse and search without AI',
    body: 'Search and filters by skill, availability and rate find every listed developer on their own. The matching is help, not a gate.',
  },
  {
    title: 'Shortlist and message',
    body: 'Move applications through shortlisted or not a fit, and message developers directly. Save the ones you want to come back to.',
  },
  {
    title: 'Everyone who wants to be listed is listed',
    body: 'There is no approval queue for developers either. Judge them on the projects and links they show.',
  },
  {
    title: 'No fees, no middleman',
    body: 'techselect takes no fee and handles no payments. Terms, rates and contracts are agreed directly between you and the developer.',
  },
] as const;

export default function ForClientsPage() {
  return (
    <>
      <PageIntro
        eyebrow="For clients"
        title="Find developers by what they have shipped"
        lead="Post a brief for software, web or automation work. Matching reads what you need and the projects developers describe, and shows you who fits — and why."
      >
        <Link href="/signup?role=client" className={buttonStyles({ size: 'lg' })}>
          Post a brief
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

      <FeatureGrid heading="Posting a job" items={POSTING} />
      <FeatureGrid heading="Finding the right person" items={FINDING} />

      <PageCta
        title="Write the brief once. See who fits, in order, with a reason for each."
        primary={{ href: '/signup?role=client', label: 'Sign up as a client' }}
        secondary={{ href: '/for-freelancers', label: 'Looking for work instead?' }}
      />
    </>
  );
}
