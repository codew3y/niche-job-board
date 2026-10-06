import type { Icon } from '@phosphor-icons/react';
import {
  AppWindow,
  ArrowUpRight,
  ChartBar,
  Cloud,
  Code,
  DeviceMobile,
  Globe,
  Layout,
  Robot,
  Sparkle,
  TestTube,
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { CSSProperties } from 'react';

import { CONTAINER, SECTION } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * The work categories on the home page, as a bento: ten categories, exactly ten cells.
 *
 * LAYOUT. Four columns from `lg`: the first row is two wide cells (the two categories most briefs
 * land in), then two rows of four. Two columns below `lg`, where the wide cells span both.
 *
 * COLOUR. Each category has its own hue, on the tile behind its icon and nowhere else: the card
 * itself stays plain white, so ten colours read as accents, not as ten tinted boxes. Static class
 * strings (Tailwind only generates classes it can read), each with its dark-theme pair. A one-line description says
 * what falls under the name, and an arrow comes forward on hover to say the card is a link.
 *
 * PLACEHOLDER LINKS: each card goes to Browse with `category=<slug>`. Browse does not filter by
 * category yet: the curated skill taxonomy groups skills differently (Frontend, Backend,
 * Cloud & DevOps…), and several of these (UI/UX Design, QA & Testing) have no taxonomy category
 * at all. Wiring real filtering means mapping each card to a set of skill slugs.
 */
type Category = {
  slug: string;
  label: string;
  blurb: string;
  icon: Icon;
  /** The icon tile: background and icon colour, light and dark. */
  tile: string;
};

const CATEGORIES: Category[] = [
  {
    slug: 'development-it',
    label: 'Development & IT',
    blurb: 'Back ends, APIs, integrations and the systems that hold a business together.',
    icon: Code,
    tile: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
  },
  {
    slug: 'ai-automations',
    label: 'AI Automations',
    blurb: 'n8n, Zapier and Make flows, agents and bots that take the busywork away.',
    icon: Robot,
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300',
  },
  {
    slug: 'ai-services',
    label: 'AI Services',
    blurb: 'Chatbots, retrieval and model work',
    icon: Sparkle,
    tile: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-400/15 dark:text-fuchsia-300',
  },
  {
    slug: 'application-development',
    label: 'Application Development',
    blurb: 'Desktop and SaaS products',
    icon: AppWindow,
    tile: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300',
  },
  {
    slug: 'web-development',
    label: 'Web Development',
    blurb: 'Sites, stores and web apps',
    icon: Globe,
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
  },
  {
    slug: 'mobile-development',
    label: 'Mobile Development',
    blurb: 'iOS, Android and cross-platform',
    icon: DeviceMobile,
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
  },
  {
    slug: 'data-analytics',
    label: 'Data & Analytics',
    blurb: 'Pipelines, dashboards, reporting',
    icon: ChartBar,
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
  },
  {
    slug: 'devops-cloud',
    label: 'DevOps & Cloud',
    blurb: 'Infrastructure, CI/CD, hosting',
    icon: Cloud,
    tile: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-400/15 dark:text-cyan-300',
  },
  {
    slug: 'qa-testing',
    label: 'QA & Testing',
    blurb: 'Test suites, audits, automation',
    icon: TestTube,
    tile: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300',
  },
  {
    slug: 'ui-ux-design',
    label: 'UI/UX Design',
    blurb: 'Interfaces, flows, prototypes',
    icon: Layout,
    tile: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
  },
];

/** The first two cells are featured: wide and taller. */
const FEATURED_COUNT = 2;

export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading" className={cn(CONTAINER, SECTION)}>
      <div className="reveal grid gap-4 md:grid-cols-12 md:items-end">
        <h2 id="categories-heading" className="max-w-[22ch] text-display-sm md:col-span-7">
          Find freelancers for every type of work
        </h2>
        <p className="max-w-[44ch] text-text-muted md:col-span-5 md:justify-self-end">
          Software, web and automation work, from a one-off fix to a long engagement.
        </p>
      </div>
      <ul className="mt-12 grid grid-cols-2 gap-3 lg:mt-16 lg:grid-cols-4 lg:gap-4">
        {CATEGORIES.map(({ slug, label, blurb, icon: Icon, tile }, i) => {
          const featured = i < FEATURED_COUNT;
          return (
            <li
              key={slug}
              style={{ '--i': i % 4 } as CSSProperties}
              className={cn('reveal', featured && 'col-span-2')}
            >
              <Link
                href={`/browse?type=developers&category=${slug}`}
                className={cn(
                  'pressable liftable group relative flex h-full flex-col justify-between gap-6 overflow-hidden rounded-xl border border-border-base bg-surface-raised p-5 hover:border-border-strong sm:p-6',
                  featured ? 'min-h-44 sm:min-h-52' : 'min-h-40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'grid place-items-center rounded-xl',
                      featured ? 'size-14' : 'size-11',
                      tile,
                    )}
                  >
                    <Icon size={featured ? 28 : 22} weight="duotone" />
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    size={18}
                    className="text-text-subtle opacity-0 transition-[opacity,transform] duration-fast ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </div>
                <div className="min-w-0">
                  <span
                    className={cn(
                      'block font-semibold break-words hyphens-auto',
                      featured ? 'text-2xl tracking-tight' : 'text-base',
                    )}
                  >
                    {label}
                  </span>
                  <span
                    className={cn(
                      'mt-1.5 block text-text-muted',
                      featured ? 'max-w-[44ch]' : 'text-sm max-sm:hidden',
                    )}
                  >
                    {blurb}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
