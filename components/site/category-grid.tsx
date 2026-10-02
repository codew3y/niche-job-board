import type { Icon } from '@phosphor-icons/react';
import {
  AppWindow,
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
 * The work categories on the home page, as a bento: ten categories, exactly ten cells
 * (taste-skill bento cell-count rule).
 *
 * LAYOUT. Four columns from `lg`: the first row is two wide, tinted cells (the two categories
 * most briefs land in), then two rows of four. Two columns below `lg`, where the wide cells span
 * both. The two tints are the background variation taste-skill asks of a bento (not every cell
 * white-on-white), taken from the palette's neutral and accent tints, nothing new.
 *
 * Icons are Phosphor, one family and one weight across the site.
 *
 * PLACEHOLDER LINKS: each card goes to Browse with `category=<slug>`. Browse does not filter by
 * category yet: the curated skill taxonomy groups skills differently (Frontend, Backend,
 * Cloud & DevOps…), and several of these (UI/UX Design, QA & Testing) have no taxonomy category
 * at all. Wiring real filtering means mapping each card to a set of skill slugs.
 */
const CATEGORIES: { slug: string; label: string; icon: Icon }[] = [
  { slug: 'development-it', label: 'Development & IT', icon: Code },
  { slug: 'ai-automations', label: 'AI Automations', icon: Robot },
  { slug: 'ai-services', label: 'AI Services', icon: Sparkle },
  { slug: 'application-development', label: 'Application Development', icon: AppWindow },
  { slug: 'web-development', label: 'Web Development', icon: Globe },
  { slug: 'mobile-development', label: 'Mobile Development', icon: DeviceMobile },
  { slug: 'data-analytics', label: 'Data & Analytics', icon: ChartBar },
  { slug: 'devops-cloud', label: 'DevOps & Cloud', icon: Cloud },
  { slug: 'qa-testing', label: 'QA & Testing', icon: TestTube },
  { slug: 'ui-ux-design', label: 'UI/UX Design', icon: Layout },
];

/** The two featured cells: wide, taller, and tinted. */
const FEATURED = ['bg-primary-subtle', 'bg-accent-subtle'];

export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading" className={cn(CONTAINER, SECTION)}>
      <h2 id="categories-heading" className="reveal max-w-[22ch] text-display-sm">
        Find freelancers for every type of work
      </h2>
      <ul className="mt-12 grid grid-cols-2 gap-3 lg:mt-16 lg:grid-cols-4 lg:gap-4">
        {CATEGORIES.map(({ slug, label, icon: Icon }, i) => {
          const featured = i < FEATURED.length;
          return (
            <li
              key={slug}
              style={{ '--i': i % 4 } as CSSProperties}
              className={cn('reveal', featured && 'col-span-2')}
            >
              <Link
                href={`/browse?type=developers&category=${slug}`}
                className={cn(
                  'pressable liftable group flex h-full flex-col justify-between gap-6 rounded-lg border p-5 sm:p-6',
                  featured
                    ? cn('min-h-36 border-transparent sm:min-h-44', FEATURED[i])
                    : 'min-h-32 border-border-base bg-surface-raised hover:border-border-strong',
                )}
              >
                <Icon
                  aria-hidden="true"
                  size={featured ? 32 : 24}
                  className="text-text-muted transition-colors duration-fast ease-out group-hover:text-text"
                />
                <span
                  className={cn(
                    'min-w-0 font-medium break-words hyphens-auto',
                    featured ? 'text-xl tracking-tight' : 'text-base',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
