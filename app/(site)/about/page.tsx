import type { Metadata } from 'next';
import Link from 'next/link';

import { CONTAINER, FeatureBento, PageCta, PageIntro } from '@/components/site/page-parts';
import { cn } from '@/lib/ui/cn';
import aboutPhoto from '@/public/images/pages/about.jpg';

export const metadata: Metadata = {
  title: 'About',
  description:
    'TechSelect is a job board for software, web and automation work, built around shipped projects rather than keyword matching.',
  alternates: { canonical: '/about' },
};

/**
 * About. Only claims the repository itself makes: the niche (ADR-003), open listing
 * (ADR-008), no fees and no payments (terms), order-and-reason instead of scores (ADR-007 D2),
 * and matching on Google's Gemini API (privacy policy). No team, figures or history invented.
 *
 * Four sections, four layout families: split intro with a photograph, bento, a two-column
 * prose panel, closing panel. One eyebrow (the intro).
 */
const BELIEFS = [
  {
    title: 'A focused niche',
    body: 'Software development, web development, and automation and integration work: n8n, Zapier, APIs, WhatsApp bots. A narrow scope keeps the skill list precise and the matching sharp.',
  },
  {
    title: 'Anyone may list',
    body: 'There is no approval queue and no minimum profile. Who is worth hiring is the client’s judgement. A platform gate would put its taste in place of theirs.',
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
    body: 'TechSelect takes no fee and handles no payments or contracts. Once two people connect, the arrangement is theirs.',
  },
  {
    title: 'Works without the AI',
    body: 'Search and filters find every job and every developer on their own. Matching helps you look. It never hides anyone.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="A job board where shipped work is the profile"
        lead="TechSelect connects freelance developers with clients. The best evidence of what someone can do is what they have built."
        image={{
          // Azwedo L.LC, https://unsplash.com/photos/nbEX3qxtmuA (Unsplash License).
          src: aboutPhoto,
          alt: 'Two people smiling as they work through something together on a laptop',
        }}
      />

      <FeatureBento heading="What we believe" items={BELIEFS} />

      {/* Your data: heading and a short summary on the left, the detail beside it. Stacked
          below `md`. */}
      <section aria-labelledby="data-heading" className={cn(CONTAINER, 'py-12 sm:py-16')}>
        <div className="grid gap-6 border-t border-border-strong pt-10 md:grid-cols-[1fr_2fr] md:gap-12">
          <h2 id="data-heading" className="text-display-sm text-balance">
            Your data
          </h2>
          <div className="max-w-[65ch] space-y-4 text-text-muted text-pretty">
            <p>
              A published developer profile is public, because being found is the point of having
              one. Drafts, saved lists, applications and messages are visible only to the people
              directly involved. The database enforces that, not the application remembering to
              check. You can delete your account from settings at any time.
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
