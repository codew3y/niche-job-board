import { CandidateMatchItem } from '@/components/matches/match-items';
import { ContactDialog } from '@/components/messaging/contact-dialog';
import type { CandidateMatch } from '@/lib/services/matches';

/**
 * Developers who fit this brief and have not applied.
 *
 * The other half of a two-sided market: a client should not have to wait for the right person
 * to find them. Separate from the applications list on purpose — these people have not agreed
 * to anything, so presenting them alongside applicants would misrepresent both.
 *
 * NO SCORE, same rule as the candidate list (ADR-007 D2). Order and reason.
 */
export function SuggestedList({
  matches,
  job,
}: {
  matches: CandidateMatch[];
  /** The brief they fit: a message from here is about it. */
  job: { id: string; title: string };
}) {
  return (
    <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
      {matches.map((m) => (
        <CandidateMatchItem
          key={m.talentId}
          match={m}
          action={
            m.acceptsMessages ? (
              <ContactDialog
                talentId={m.talentId}
                talentHeadline={m.headline}
                jobs={[job]}
                defaultJobId={job.id}
                trigger="compact"
              />
            ) : null
          }
        />
      ))}
    </ul>
  );
}
