import Image from 'next/image';
import { ExternalLink } from '@/components/shared/external-link';

type Item = {
  id: string;
  title: string;
  description: string;
  role: string | null;
  outcome: string | null;
  tech_stack: string[];
  item_media?: { id: string; url: string; alt_text: string; sort_order: number }[];
  repo_url: string | null;
  live_url: string | null;
};

/**
 * The four evidence states of ADR-004, rendered.
 *
 *   site only  → a prominent link-out card
 *   items only → the gallery
 *   both       → both, site first
 *   neither    → cannot happen on a published profile; the publish gate forbids it
 *
 * The site-only card says plainly that we do not read the linked site. That is the honest
 * framing of the §8 thin-profile trade-off: a URL is a link, not text we can match on, and
 * telling the visitor so is better than implying we have assessed it.
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
    // Only ever visible to the owner, since the publish gate blocks this state going public.
    return isOwner ? (
      <section className="rounded-md border border-dashed border-border-strong p-6 text-center">
        <p className="font-medium">No evidence yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted text-pretty">
          Link your portfolio site, or add two projects. Either unlocks publishing.
        </p>
      </section>
    ) : null;
  }

  return (
    <div className="space-y-6">
      {hasSite && (
        <section className="rounded-md border border-border-base bg-surface-raised p-5">
          <h2 className="font-medium">Portfolio site</h2>
          <p className="mt-1">
            <ExternalLink href={websiteUrl} className="text-accent">
              {websiteUrl!.replace(/^https:\/\//, '')}
            </ExternalLink>
          </p>
          <p className="mt-2 text-sm text-text-subtle text-pretty">
            Hosted elsewhere — we link it but never fetch it, so it doesn&rsquo;t feed matching.
          </p>
        </section>
      )}

      {hasItems && (
        <section>
          <h2 className="font-medium">
            {items.length} {items.length === 1 ? 'project' : 'projects'}
          </h2>
          <ul className="mt-3 space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border-base bg-surface-raised p-5"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="font-medium">{item.title}</h3>
                  {item.role && <p className="text-sm text-text-subtle">{item.role}</p>}
                </div>

                <p className="mt-1.5 text-sm text-text-muted text-pretty">{item.description}</p>

                {item.outcome && item.outcome !== item.description && (
                  // Outcome is the most persuasive field on a profile — what changed, not
                  // what was used. Given its own visual weight for that reason.
                  <p className="mt-2 border-l-2 border-accent/40 pl-3 text-sm text-pretty">
                    {item.outcome}
                  </p>
                )}

                {(item.item_media?.length ?? 0) > 0 && (
                  <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[...(item.item_media ?? [])]
                      .sort((a, b) => a.sort_order - b.sort_order)
                      .map((m) => (
                        <li key={m.id}>
                          {/* `sizes` is the whole point: one column on phones, two from the
                              sm breakpoint. Get it wrong and Next serves a 1600px file to a
                              360px slot, which is the state this page was already in with a
                              raw <img>. Lazy by default, so a profile carrying a dozen of
                              these below the fold costs nothing until it is scrolled to. */}
                          <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border-base">
                            <Image
                              src={m.url}
                              alt={m.alt_text}
                              fill
                              sizes="(min-width: 640px) 50vw, 100vw"
                              className="object-cover"
                            />
                          </div>
                        </li>
                      ))}
                  </ul>
                )}

                {item.tech_stack.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {item.tech_stack.map((tech) => (
                      <li
                        key={tech}
                        className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs text-text-muted"
                      >
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}

                {(item.repo_url || item.live_url) && (
                  <p className="mt-3 flex gap-4 text-sm">
                    {item.repo_url && (
                      <ExternalLink href={item.repo_url} className="text-accent">
                        Code
                      </ExternalLink>
                    )}
                    {item.live_url && (
                      <ExternalLink href={item.live_url} className="text-accent">
                        Live
                      </ExternalLink>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
