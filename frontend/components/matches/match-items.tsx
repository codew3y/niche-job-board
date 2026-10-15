import { ArrowRight } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { ExternalLink } from '@/components/shared/external-link';
import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { CandidateMatch, TalentMatch } from '@techselect/backend/services/matches';
import { STRONG_MATCH_SCORE } from '@techselect/backend/services/matches';
import { cn } from '@/lib/ui/cn';

/**
 * The reason a match was made: the product's differentiator, so it is set apart from the
 * metadata around it. A shield-blue rule (an indicator, never text colour) on the left, the
 * sentence itself in full-contrast body text at a readable size, and an optional small label
 * ("Why it fits", "Outcome") so the block says what it is without relying on the rule.
 *
 * In a list it stays at body size: a column of display type is slow to scan.
 */
export function MatchReason({
  children,
  className,
  label,
}: {
  children: string;
  className?: string;
  /** A short visible caption above the sentence. Omitted, the block is the sentence alone. */
  label?: string;
}) {
  return (
    <div className={cn('border-l-2 border-accent py-0.5 pl-4', className)}>
      {label && <p className="font-mono text-xs text-text-subtle">{label}</p>}
      <p className={cn('max-w-prose text-base leading-relaxed text-text', label && 'mt-0.5')}>
        {children}
      </p>
    </div>
  );
}

/** Key facts as a wrapping list rather than a dot-separated string: no fact splits on a phone. */
function Facts({ items }: { items: (string | null | undefined)[] }) {
  const shown = items.filter((x): x is string => Boolean(x));
  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-text-muted">
      {shown.map((text, i) => (
        <li key={`${i}-${text}`} className="tabular-nums">
          {text}
        </li>
      ))}
    </ul>
  );
}

/**
 * One job matched to the signed-in developer.
 *
 * The developer sees their OWN score on their OWN matches. Null means the ranking
 * came from vectors alone because the re-ranker was unavailable: the order is real, the number
 * would not be, so none is shown rather than a fabricated one.
 *
 * Hierarchy: title and score on the first line, the company and terms below, then the reason.
 * The whole row is the one action (open the job).
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
    <li className="relative px-5 py-6 transition-colors duration-fast ease-out hover:bg-surface-sunken/60 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-balance">
            {/* The title link covers the row (after:inset-0), so the whole row is one target
                without nesting interactive elements inside a link. */}
            <Link
              href={`/jobs/${match.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {match.title}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm font-medium text-text">{match.companyName ?? 'A client'}</p>
          <Facts
            items={[
              LOCATION_LABEL[match.locationType] ?? match.locationType,
              ENGAGEMENT_LABEL[match.engagementType] ?? match.engagementType,
              budget,
            ]}
          />
        </div>
        {match.score !== null && (
          <Badge
            tone={strong ? 'accent' : 'neutral'}
            size="md"
            className="shrink-0 font-semibold tabular-nums"
          >
            <span className="sr-only">Match score </span>
            {match.score}
            <span className="text-xs font-medium" aria-hidden="true">
              /100
            </span>
            <span className="sr-only"> out of 100</span>
          </Badge>
        )}
      </div>
      {match.reason && (
        <MatchReason className="mt-3.5" label="Why it fits">
          {match.reason}
        </MatchReason>
      )}
    </li>
  );
}

/**
 * A developer who fits a client's brief and has not applied.
 *
 * NO SCORE: order and reason only. The type has no score field at all, so there is
 * nothing to leak.
 */
export function CandidateMatchItem({
  match,
  action,
}: {
  match: CandidateMatch;
  /** An extra control for the row, such as a Message button on a job's suggestions. */
  action?: React.ReactNode;
}) {
  const evidence =
    match.portfolioItemCount > 0
      ? `${match.portfolioItemCount} project${match.portfolioItemCount === 1 ? '' : 's'}`
      : match.websiteUrl
        ? 'Portfolio site'
        : 'No work shown yet';

  return (
    <li className="px-5 py-6 sm:px-6">
      <div className="flex items-start gap-3.5">
        <Avatar name={match.headline} src={match.avatarUrl} className="hidden sm:grid" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-balance">
            <Link href={`/talent/${match.slug}`} className="hover:underline">
              {match.headline}
            </Link>
          </h3>
          <p className="mt-0.5 text-sm text-text-muted tabular-nums">{evidence}</p>
          {match.reason && (
            <MatchReason className="mt-3.5" label="Why they fit">
              {match.reason}
            </MatchReason>
          )}
          <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <Link
              href={`/talent/${match.slug}`}
              className="inline-flex h-10 items-center gap-1 font-semibold text-link hover:underline"
            >
              See their work <ArrowRight aria-hidden="true" size={14} />
            </Link>
            {match.websiteUrl && (
              <ExternalLink
                href={match.websiteUrl}
                className="inline-flex h-10 items-center text-text-muted"
              >
                Portfolio site
              </ExternalLink>
            )}
            {action}
          </p>
        </div>
      </div>
    </li>
  );
}
