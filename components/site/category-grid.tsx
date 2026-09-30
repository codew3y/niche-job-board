import {
  BarChart3,
  Bot,
  Cloud,
  Code2,
  Globe,
  LayoutTemplate,
  type LucideIcon,
  Smartphone,
  Sparkles,
  TestTubeDiagonal,
  AppWindow,
} from 'lucide-react';
import Link from 'next/link';

import { CONTAINER } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * The work categories on the home page. Icons are all lucide-react, for one consistent line.
 *
 * PLACEHOLDER LINKS: each card goes to Browse with `category=<slug>`. Browse does not filter by
 * category yet: the curated skill taxonomy groups skills differently (Frontend, Backend,
 * Cloud & DevOps…), and several of these (UI/UX Design, QA & Testing) have no taxonomy category
 * at all. Wiring real filtering means mapping each card to a set of skill slugs.
 */
const CATEGORIES: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: 'development-it', label: 'Development & IT', icon: Code2 },
  { slug: 'ai-automations', label: 'AI Automations', icon: Bot },
  { slug: 'ai-services', label: 'AI Services', icon: Sparkles },
  { slug: 'application-development', label: 'Application Development', icon: AppWindow },
  { slug: 'web-development', label: 'Web Development', icon: Globe },
  { slug: 'mobile-development', label: 'Mobile Development', icon: Smartphone },
  { slug: 'data-analytics', label: 'Data & Analytics', icon: BarChart3 },
  { slug: 'devops-cloud', label: 'DevOps & Cloud', icon: Cloud },
  { slug: 'qa-testing', label: 'QA & Testing', icon: TestTubeDiagonal },
  { slug: 'ui-ux-design', label: 'UI/UX Design', icon: LayoutTemplate },
];

export function CategoryGrid() {
  return (
    <section aria-labelledby="categories-heading" className={cn(CONTAINER, 'py-16 sm:py-24')}>
      <h2 id="categories-heading" className="max-w-2xl text-display-sm text-balance">
        Find freelancers for every type of work
      </h2>
      {/* Two columns on phones (360px fits two 150px tiles), three from `sm`, five from `lg`. */}
      {/* Columns sized in rem, not counted, so 200% text zoom drops to fewer columns instead of
          squeezing "Development" past the edge (e2e/accessibility). Five across from `lg`. */}
      <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,9.5rem),1fr))] gap-3 lg:grid-cols-5">
        {CATEGORIES.map(({ slug, label, icon: Icon }) => (
          <li key={slug}>
            <Link
              href={`/browse?type=developers&category=${slug}`}
              className="pressable group flex h-full min-h-14 items-center gap-2.5 rounded-lg border border-border-base bg-surface-raised p-3 shadow-xs hover:border-accent hover:bg-accent-subtle sm:gap-3 sm:p-4"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary sm:size-10 transition-colors duration-fast ease-out group-hover:bg-surface-raised group-hover:text-link">
                <Icon aria-hidden="true" size={20} />
              </span>
              <span className="min-w-0 text-sm font-semibold break-words hyphens-auto text-balance">
                {label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
