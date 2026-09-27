import Link from 'next/link';

import { ExternalLink } from '@/components/shared/external-link';
import type { CandidateMatch } from '@/lib/services/matches';

/**
 * Developers who fit this brief and have not applied.
 *
 * The other half of a two-sided market: a client should not have to wait for the right person
 * to find them. Separate from the applications list on purpose — these people have not agreed
 * to anything, so presenting them alongside applicants would misrepresent both.
 *
 * NO SCORE, same rule as the candidate list (ADR-007 D2). Order and reason. The type this
 * takes has no score field at all, so there is nothing to leak.
 */
export function SuggestedList({ matches }: { matches: CandidateMatch[] }) {
  return (
    <ul className="divide-y divide-border-base rounded-md border border-border-base">
      {matches.map((m) => (
        <li key={m.talentId} className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-base font-medium">
              <Link href={`/talent/${m.slug}`} className="hover:text-accent">
                {m.headline}
              </Link>
            </h3>
            <p className="text-sm text-text-muted">
              {m.portfolioItemCount > 0
                ? `${m.portfolioItemCount} project${m.portfolioItemCount === 1 ? '' : 's'}`
                : m.websiteUrl
                  ? 'Portfolio site'
                  : 'No work shown yet'}
            </p>
          </div>

          {m.reason && (
            <p className="mt-2 border-l-2 border-accent/40 pl-3 text-sm text-pretty">{m.reason}</p>
          )}

          <p className="mt-3 flex gap-4 text-sm">
            <Link href={`/talent/${m.slug}`} className="text-accent underline underline-offset-2">
              See their work
            </Link>
            {m.websiteUrl && (
              <ExternalLink href={m.websiteUrl} className="text-text-muted">
                Portfolio site
              </ExternalLink>
            )}
          </p>
        </li>
      ))}
    </ul>
  );
}
