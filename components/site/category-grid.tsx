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

/**
 * The work categories on the home page. Icons are all lucide-react, for one consistent line.
 *
 * PLACEHOLDER LINKS: each card goes to Browse with `category=<slug>`. Browse does not filter by
 * category yet — the curated skill taxonomy groups skills differently (Frontend, Backend,
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
    <section
      aria-labelledby="categories-heading"
      className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"
    >
      <h2 id="categories-heading" className="text-display-sm text-balance">
        Find freelancers for every type of work
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map(({ slug, label, icon: Icon }) => (
          <li key={slug}>
            <Link
              href={`/browse?type=developers&category=${slug}`}
              className="group flex h-full flex-col gap-3 rounded-lg border border-border-base bg-surface-raised p-4 transition-colors duration-fast ease-out hover:border-accent hover:bg-accent-subtle"
            >
              <span className="grid size-10 place-items-center rounded-md bg-surface-sunken text-text-muted transition-colors duration-fast ease-out group-hover:bg-surface-raised group-hover:text-accent">
                <Icon aria-hidden="true" size={20} />
              </span>
              <span className="text-sm font-semibold">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
