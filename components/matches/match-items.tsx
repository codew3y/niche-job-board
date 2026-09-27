import Link from 'next/link';

import { ExternalLink } from '@/components/shared/external-link';
import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CandidateMatch, TalentMatch } from '@/lib/services/matches';
import { STRONG_MATCH_SCORE } from '@/lib/services/matches';
import { cn } from '@/lib/ui/cn';

/**
 * The reason a match was made — the product's differentiator, so it is set apart from the
 * metadata around it: an accent rule and a quoted sentence. On the landing page the same
 * sentence is a full serif pull-quote; in a list it stays in the sans, because a column of
 * italic display type is slow to scan (DESIGN.md §9, J2).
 */
export function MatchReason({ children, className }: { children: string; className?: string }) {
  return (
    <p
      className={cn(
        'border-l-2 border-accent/50 pl-3.5 text-sm leading-relaxed text-text text-pretty',
        className,
      )}
    >
      {children}
    </p>
  );
}

/**
 * One job matched to the signed-in developer.
 *
 * The developer sees their OWN score on their OWN matches (ADR-007 D2). Null means the ranking
 * came from vectors alone because the re-ranker was unavailable — the order is real, the number
 * would not be, so none is shown rather than a fabricated one.
 */
export function TalentMatchItem({ match }: { match: TalentMatch }) {
  const budget = formatRange(
    match.budgetMin,
    match.budgetMax,
    match.currency,
    match.engagementType === 'hourly' ? '/hr' : '',
  );
  const strong = match.score !== null && match.score >= STRONG_MATCH_SCORE;

  return (
    <li className="relative px-5 py-5 transition-colors duration-fast ease-out hover:bg-surface-sunken/50">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-medium text-balance">
            {/* The title link covers the row (after:inset-0), so the whole row is one target
                without nesting interactive elements inside a link. */}
            <Link
              href={`/jobs/${match.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {match.title}
            </Link>
          </h3>
          <p className="mt-1 text-sm text-text-subtle">
            {match.companyName ?? 'A client'}
            <span aria-hidden="true"> · </span>
            {LOCATION_LABEL[match.locationType] ?? match.locationType}
            <span aria-hidden="true"> · </span>
            {ENGAGEMENT_LABEL[match.engagementType] ?? match.engagementType}
            {budget && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="tabular-nums">{budget}</span>
              </>
            )}
          </p>
        </div>
        {match.score !== null && (
          <Badge tone={strong ? 'accent' : 'neutral'} size="md" className="tabular-nums">
            {match.score}
            <span className="sr-only"> out of 100 match score</span>
          </Badge>
        )}
      </div>
      {match.reason && <MatchReason className="mt-3">{match.reason}</MatchReason>}
    </li>
  );
}

/**
 * A developer who fits a client's brief and has not applied.
 *
 * NO SCORE (ADR-007 D2): order and reason only. The type has no score field at all, so there is
 * nothing to leak.
 */
export function CandidateMatchItem({ match }: { match: CandidateMatch }) {
  const evidence =
    match.portfolioItemCount > 0
      ? `${match.portfolioItemCount} project${match.portfolioItemCount === 1 ? '' : 's'}`
      : match.websiteUrl
        ? 'Portfolio site'
        : 'No work shown yet';

  return (
    <li className="px-5 py-5">
      <div className="flex items-start gap-3.5">
        <Avatar name={match.headline} />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-balance">
            <Link href={`/talent/${match.slug}`} className="hover:underline">
              {match.headline}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-text-subtle">{evidence}</p>
          {match.reason && <MatchReason className="mt-3">{match.reason}</MatchReason>}
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link href={`/talent/${match.slug}`} className="prose-link font-medium">
              See their work
            </Link>
            {match.websiteUrl && (
              <ExternalLink href={match.websiteUrl} className="text-text-muted">
                Portfolio site
              </ExternalLink>
            )}
          </p>
        </div>
      </div>
    </li>
  );
}
