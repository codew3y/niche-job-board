import { CONTAINER } from './page-parts';
import { cn } from '@/lib/ui/cn';

/**
 * A slow ticker of skills from the real taxonomy (lib/seeds/skills.seed.ts, 126 skills). Every
 * name here is a row in that file, so the strip never advertises a skill nobody can tag.
 *
 * One list, rendered twice and translated by half its width (animate-marquee), so the loop has
 * no seam. The second copy is aria-hidden: a screen reader hears the list once, as a list.
 * Pauses on hover; stops under prefers-reduced-motion (app/globals.css), when the strip can
 * still be scrolled by hand.
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
      {/* A horizontally scrollable strip, not a clipped one. While it animates the skills come
          round on their own; when it is still (reduced motion, or paused on hover) every skill
          can still be reached by swiping or scrolling. A clipped box would hide most of them
          for good, which e2e/responsive.spec.ts rightly fails ("keeps every element inside the
          viewport" only exempts scrollable strips). The scrollbar is hidden; it is a strip of
          tags, not a document.

          Focusable (tabIndex 0, a labelled region) so a keyboard can scroll it too — axe's
          scrollable-region-focusable. It pauses while hovered or focused, so the arrow keys are
          not fighting the animation. */}
      <div
        role="region"
        aria-label="Skills, scrollable"
        tabIndex={0}
        className="group mt-4 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] focus-visible:[mask-image:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex w-max animate-marquee gap-3 group-focus-visible:[animation-play-state:paused] group-hover:[animation-play-state:paused]">
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
