import { CONTAINER } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * A slow ticker of skills from the real taxonomy (lib/seeds/skills.seed.ts, 126 skills). Every
 * name here is a row in that file, so the strip never advertises a skill nobody can tag.
 *
 * One list, rendered twice and translated by half its width (animate-marquee), so the loop has
 * no seam. The second copy is aria-hidden: a screen reader hears the list once, as a list.
 * Pauses on hover; stops under prefers-reduced-motion (app/globals.css).
 */
const SKILLS = [
  'Next.js',
  'n8n',
  'Payment integration',
  'PostgreSQL',
  'WhatsApp Business API',
  'React Native',
  'Zapier',
  'Python',
  'Shopify',
  'AI agents',
  'TypeScript',
  'Supabase',
  'Webflow',
  'RAG pipelines',
  'Docker',
  'HubSpot',
  'Flutter',
  'GraphQL',
  'Make',
  'WordPress',
  'LLM API integration',
  'AWS',
  'Airtable',
  'Web scraping',
] as const;

export function SkillTicker() {
  return (
    <section aria-labelledby="ticker-heading" className="border-y border-border-base py-6">
      <p id="ticker-heading" className={cn(CONTAINER, 'text-sm text-text-subtle')}>
        Matched across 126 skills in software, web and automation, including
      </p>
      {/* The fade at each edge is a mask, so it works on any background in either theme. */}
      <div className="group mt-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
        <div className="flex w-max animate-marquee gap-3 group-hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 gap-3">
              {SKILLS.map((skill) => (
                <li
                  key={skill}
                  className="rounded-md border border-border-base bg-surface-raised px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-text-muted"
                >
                  {skill}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}
