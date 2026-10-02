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
    <div className="space-y-8">
      {hasSite && (
        <section className="flex items-start gap-4 rounded-lg border border-border-base bg-surface-raised p-4 sm:p-5">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-sunken text-text-subtle"
          >
            <Globe size={18} />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight">Portfolio site</h2>
            <p className="mt-0.5 break-all">
              <ExternalLink href={websiteUrl} className="font-semibold">
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
        <section>
          <h2 className="text-lg font-semibold tracking-tight">
            Projects{' '}
            <span className="font-sans text-base font-medium text-text-muted tabular-nums">
              {items.length}
            </span>
          </h2>
          <ul className="mt-4 space-y-4">
            {items.map((item) => {
              const media = [...(item.item_media ?? [])].sort(
                (a, b) => a.sort_order - b.sort_order,
              );
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-lg border border-border-base bg-surface-raised"
                >
                  {media.length > 0 && (
                    <ul
                      className={cn(
                        'grid gap-px bg-border-base',
                        media.length > 1 && 'sm:grid-cols-2',
                      )}
                    >
                      {media.map((m) => (
                        <li key={m.id} className="relative aspect-video bg-surface-sunken">
                          {/* `sizes` does the work: one column on phones, two from sm. Get it
                              wrong and Next serves a 1600px file to a 360px slot. Lazy by default,
                              so a dozen of these below the fold cost nothing until scrolled to. */}
                          <Image
                            src={m.url}
                            alt={m.alt_text}
                            fill
                            sizes={
                              media.length > 1
                                ? '(min-width: 640px) 40vw, 100vw'
                                : '(min-width: 1024px) 720px, 100vw'
                            }
                            className="object-cover"
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="p-4 sm:p-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-lg font-semibold leading-tight text-balance">
                        {item.title}
                      </h3>
                      {item.role && <p className="text-sm text-text-muted">{item.role}</p>}
                    </div>

                    <p className="mt-2 text-text-muted text-pretty">{item.description}</p>

                    {item.outcome && item.outcome !== item.description && (
                      // Outcome is the most persuasive field on a profile — what changed, not what
                      // was used — so it gets the same treatment as a match reason.
                      <MatchReason className="mt-4" label="Outcome">
                        {item.outcome}
                      </MatchReason>
                    )}

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
