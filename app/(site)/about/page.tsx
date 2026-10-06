import type { Metadata } from 'next';
import Link from 'next/link';

import {
  ChatCenteredText,
  Crosshair,
  DoorOpen,
  Handshake,
  Hammer,
  MagnifyingGlass,
} from '@phosphor-icons/react/ssr';

import {
  CONTAINER,
  FeatureCards,
  PageCta,
  PageIntro,
  SECTION,
  type Feature,
} from '@/components/site/page-parts';
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
 * Four sections, four layout families: split intro with a photograph, icon cards led by a
 * statement card, a two-column
 * prose panel, closing panel. One eyebrow (the intro).
 */
const BELIEFS: Feature[] = [
  {
    title: 'A focused niche',
    icon: Crosshair,
    body: 'Software development, web development, and automation and integration work: n8n, Zapier, APIs, WhatsApp bots. A narrow scope keeps the skill list precise and the matching sharp.',
  },
  {
    title: 'Anyone may list',
    icon: DoorOpen,
    body: 'There is no approval queue and no minimum profile. Who is worth hiring is the client’s judgement. A platform gate would put its taste in place of theirs.',
  },
  {
    title: 'Work over keywords',
    icon: Hammer,
    body: 'A developer who describes a shipped project outranks one who lists the same tool. Profiles are built around projects, links and photos for that reason.',
  },
  {
    title: 'Explain, don’t score',
    icon: ChatCenteredText,
    body: 'Every match comes with a sentence of reasoning. Clients see candidates in order with that reason, never a number attached to a person.',
  },
  {
    title: 'Not a middleman',
    icon: Handshake,
    body: 'TechSelect takes no fee and handles no payments or contracts. Once two people connect, the arrangement is theirs.',
  },
  {
    title: 'Works without the AI',
    icon: MagnifyingGlass,
    body: 'Search and filters find every job and every developer on their own. Matching helps you look. It never hides anyone.',
  },
];

export default function AboutPage() {
  return (
    <>
      <PageIntro
        eyebrow="About"
        title="A job board where shipped work is the profile"
        lead="TechSelect connects freelance developers with clients. The best evidence of what someone can do is what they have built."
        image={{
          // Mimi Thian, https://unsplash.com/photos/ZKBzlifgkgw (Unsplash License), graded to
          // the site palette and cropped to 4:5.
          src: aboutPhoto,
          alt: 'Several hands around one laptop as a small team works through something together',
        }}
      />

      <FeatureCards
        heading="What we believe"
        lead="Six choices that decide how the board works, and what it will never do."
        items={BELIEFS}
        featured
      />

      {/* Your data: the heading on the left, the detail beside it, under one hairline. Stacked
          below `md`. */}
      <section aria-labelledby="data-heading" className={cn(CONTAINER, SECTION)}>
        <div className="reveal grid gap-6 border-t border-border-strong pt-12 md:grid-cols-12 md:gap-12">
          <h2 id="data-heading" className="text-display-sm md:col-span-4">
            Your data
          </h2>
          <div className="max-w-[65ch] space-y-4 text-lg text-text-muted md:col-span-8">
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
