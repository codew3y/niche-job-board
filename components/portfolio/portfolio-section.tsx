import { Kanban as FolderKanban, Globe } from '@phosphor-icons/react/ssr';
import Image from 'next/image';
import Link from 'next/link';

import { ExternalLink } from '@/components/shared/external-link';
import { MatchReason } from '@/components/matches/match-items';
import { TagList } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/ui/cn';

type Item = {
  id: string;
  title: string;
  description: string;
  role: string | null;
  outcome: string | null;
  tech_stack: string[];
  item_media?: { id: string; url: string; alt_text: string; sort_order: number }[];
  links: string[];
};

/** A readable name for a project link: "github.com/you/app" rather than the full URL. */
const linkLabel = (url: string) => url.replace(/^https:\/\/(www\.)?/i, '').replace(/\/$/, '');

/**
 * The four evidence states of ADR-004, rendered.
 *
 *   site only  → a prominent link-out card
 *   items only → the projects
 *   both       → both, site first
 *   neither    → shown to the owner only, as a prompt with the next step; a visitor sees
 *                nothing rather than an empty box with an apology in it
 *
 * The site card says plainly that we do not read the linked site. That is the honest framing of
 * the §8 thin-profile trade-off: a URL is a link, not text we can match on.
 */
export function PortfolioSection({
  websiteUrl,
  items,
  isOwner,
}: {
  websiteUrl: string | null;
  items: Item[];
  isOwner?: boolean;
}) {
  const hasSite = Boolean(websiteUrl);
  const hasItems = items.length > 0;

  if (!hasSite && !hasItems) {
    return isOwner ? (
      <section aria-label="Your work">
        <EmptyState
          icon={FolderKanban}
          title="No work shown yet"
          body="Link your portfolio site, or add a couple of projects. Either gives a client something to judge."
          action={
            <Link
              href="/dashboard/talent/profile#projects"
              className={buttonStyles({ variant: 'secondary' })}
            >
              Add a project
            </Link>
          }
        />
      </section>
    ) : null;
  }

  return (
    <div className="space-y-12">
      {hasSite && (
        <section className="flex items-start gap-4 rounded-lg border border-border-base bg-surface-raised p-5 sm:p-6">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-text-subtle"
          >
            <Globe size={18} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight">Portfolio site</h2>
            <p className="mt-0.5 break-all">
              <ExternalLink href={websiteUrl} className="font-medium">
                {websiteUrl!.replace(/^https:\/\//, '')}
              </ExternalLink>
            </p>
            <p className="mt-2 text-sm text-text-muted text-pretty">
              Hosted elsewhere. We link to it but never read it, so it does not feed matching.
            </p>
          </div>
        </section>
      )}

      {hasItems && (
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="text-display-sm">
            Projects{' '}
            <span className="font-mono text-base font-normal text-text-subtle tabular-nums">
              {items.length}
            </span>
          </h2>
          {/* THE WORK IS THE HERO. Each project is an open block under a hairline, not a card:
              the first image large in the nested frame (the one place soft-skill's double bezel
              is used), further images as framed thumbnails, then what was done and what changed. */}
          <ul className="mt-8 divide-y divide-border-base border-t border-border-base">
            {items.map((item) => {
              const media = [...(item.item_media ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              );
              const [lead, ...rest] = media;
              return (
                <li key={item.id} className="py-10 first:pt-8">
                  {lead && (
                    <div className="frame-tray">
                      <div className="rounded-inner relative aspect-16/10 overflow-hidden bg-surface-sunken">
                        {/* `sizes` does the work: Next serves a file sized to the slot, not a
                            1600px original to a 360px phone. Lazy by default, so projects below
                            the fold cost nothing until scrolled to. */}
                        <Image
                          src={lead.url}
                          alt={lead.alt_text}
                          fill
                          sizes="(min-width: 1024px) 46rem, 100vw"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {rest.length > 0 && (
                    <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {rest.map((m) => (
                        <li key={m.id} className="frame-tray">
                          <div className="rounded-inner relative aspect-4/3 overflow-hidden bg-surface-sunken">
                            <Image
                              src={m.url}
                              alt={m.alt_text}
                              fill
                              sizes="(min-width: 640px) 15rem, 50vw"
                              className="object-cover"
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className={cn(lead && 'mt-7')}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-2xl font-semibold tracking-tight">{item.title}</h3>
                      {item.role && (
                        <p className="font-mono text-xs text-text-subtle">{item.role}</p>
                      )}
                    </div>

                    <p className="mt-3 max-w-[65ch] text-text-muted">{item.description}</p>

                    {item.outcome && item.outcome !== item.description && (
                      // Outcome is the most persuasive field on a profile (what changed, not what
                      // was used), so it gets the same treatment as a match reason.
                      <MatchReason className="mt-5" label="Outcome">
                        {item.outcome}
                      </MatchReason>
                    )}

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <TagList
                        label="Built with"
                        tags={item.tech_stack.map((name) => ({ name }))}
                      />
                      {item.links.length > 0 && (
                        <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-sm">
                          {item.links.map((url) => (
                            <li key={url} className="min-w-0 truncate">
                              <ExternalLink href={url}>{linkLabel(url)}</ExternalLink>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
