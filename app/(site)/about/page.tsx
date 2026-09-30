import type { Metadata } from 'next';
import Link from 'next/link';

import { FeatureGrid, PageCta, PageIntro } from '@/components/site/page-parts';

export const metadata: Metadata = {
  title: 'About',
  description:
    'techselect is a job board for software, web and automation work, built around shipped projects rather than keyword matching.',
  alternates: { canonical: '/about' },
};

/**
 * About. Only claims the repository itself makes: the niche (ADR-003), open listing
 * (ADR-008), no fees and no payments (terms), order-and-reason instead of scores (ADR-007 D2),
 * and matching on Google's Gemini API (privacy policy). No team, figures or history invented.
 */
const BELIEFS = [
  {
    title: 'A focused niche',
    body: 'Software development, web development, and automation and integration work — n8n, Zapier, APIs, WhatsApp bots. A narrow scope keeps the skill list precise and the matching sharp.',
  },
  {
    title: 'Anyone may list',
    body: 'There is no approval queue and no minimum profile. Who is worth hiring is the client’s judgement; a platform gate would substitute its taste for theirs.',
  },
  {
    title: 'Work over keywords',
    body: 'A developer who describes a shipped project outranks one who lists the same tool. Profiles are built around projects, links and photos for that reason.',
  },
  {
    title: 'Explain, don’t score',
    body: 'Every match comes with a sentence of reasoning. Clients see candidates in order with that reason, never a number attached to a person.',
  },
  {
    title: 'Not a middleman',
    body: 'techselect takes no fee and handles no payments or contracts. Once two people connect, the arrangement is theirs.',
  },
  {
    title: 'Works without the AI',
    body: 'Search and filters find every job and every developer on their own. Matching helps you look; it never hides anyone.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="A job board where shipped work is the profile"
        lead="techselect connects freelance developers with clients for software, web and automation work. It is built on one idea: the best evidence of what someone can do is what they have already built."
      />

      <FeatureGrid heading="What we believe" items={BELIEFS} />

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="max-w-3xl space-y-4 text-text-muted text-pretty">
          <h2 className="text-display-sm text-text">Your data</h2>
          <p>
            A published developer profile is public, because being found is the point of having one.
            Drafts, saved lists, applications and messages are visible only to the people directly
            involved — enforced by the database, not by the application remembering to check. You
            can delete your account from settings at any time.
          </p>
          <p>
            The{' '}
            <Link href="/privacy" className="prose-link text-text">
              privacy policy
            </Link>{' '}
            and{' '}
            <Link href="/terms" className="prose-link text-text">
              terms
            </Link>{' '}
            set out the details, including what the matching sends to Google.
          </p>
        </div>
      </section>

      <PageCta
        title="Show the work. Let the right people find it."
        primary={{ href: '/signup', label: 'Sign up' }}
        secondary={{ href: '/how-it-works', label: 'How it works' }}
      />
    </>
  );
}
