import Link from 'next/link';

import { MatchReason } from '@/components/matches/match-items';
import { ActionForm } from '@/components/ui/action-form';
import { Avatar } from '@/components/ui/avatar';
import { SubmitButton } from '@/components/ui/submit-button';
import { StatusBadge } from './status-badge';
import { updateApplicationStatus } from '@/lib/actions/applications';
import { allowedStatusTransitions } from '@/lib/schemas/enums';

type Candidate = {
  id: string;
  /** The profile id, used to join against the cached ranking. */
  talent_id: string;
  status: string;
  cover_note: string;
  created_at: string;
  /**
   * Why this applicant fits, from the cached ranking — NOT from a column on `applications`.
   * `match_reason` used to be read from that table and was never written to it, so this
   * always rendered nothing.
   */
  reason?: string | null;
  /** False means unmeasured, not poor: usually they applied after the last warm. */
  ranked?: boolean;
  talent_profiles: {
    slug: string;
    headline: string;
    portfolio_item_count: number;
    website_url: string | null;
  } | null;
};

const ACTION = {
  viewed: { label: 'Mark as viewed', done: 'Marked as viewed', variant: 'ghost' },
  shortlisted: { label: 'Shortlist', done: 'Shortlisted', variant: 'secondary' },
  rejected: { label: 'Not a fit', done: 'Marked as not a fit', variant: 'danger-ghost' },
  hired: { label: 'Hire', done: 'Marked as hired', variant: 'accent' },
} as const;

/**
 * The client's application inbox.
 *
 * Deliberately shows NO numeric match score (ADR-007 D2) — ordering and the written reason
 * only. A number attached to a person reads as a verdict this system cannot justify, and it
 * penalises thin profiles for a data gap rather than for ability.
 *
 * The available actions come from `allowedStatusTransitions`, so the UI cannot offer a
 * transition the action would refuse. Rendering a button that fails on click is worse than
 * not rendering it. Each change confirms with a toast: the badge updates in place, which is
 * easy to miss after a click further down the card.
 */
export function CandidateList({ candidates }: { candidates: Candidate[] }) {
  return (
    <ul className="space-y-3">
      {candidates.map((c) => {
        const next = allowedStatusTransitions.client[
          c.status as keyof typeof allowedStatusTransitions.client
        ] as readonly string[];
        const profile = c.talent_profiles;
        const evidence = profile
          ? profile.portfolio_item_count > 0
            ? `${profile.portfolio_item_count} project${profile.portfolio_item_count === 1 ? '' : 's'}`
            : profile.website_url
              ? 'Portfolio site'
              : 'No evidence yet'
          : null;

        return (
          <li key={c.id} className="rounded-lg border border-border-base bg-surface-raised p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3.5">
                <Avatar name={profile?.headline ?? 'Removed'} />
                <div className="min-w-0">
                  <h3 className="font-semibold text-balance">
                    {profile ? (
                      <Link href={`/talent/${profile.slug}`} className="hover:underline">
                        {profile.headline}
                      </Link>
                    ) : (
                      'Profile removed'
                    )}
                  </h3>
                  <p className="mt-0.5 text-sm text-text-subtle">
                    {evidence && <>{evidence} · </>}
                    Applied{' '}
                    <time dateTime={c.created_at}>
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </time>
                  </p>
                </div>
              </div>
              <StatusBadge status={c.status} />
            </div>

            <p className="mt-4 text-sm whitespace-pre-line text-text-muted text-pretty">
              {c.cover_note}
            </p>

            {c.reason && <MatchReason className="mt-4">{c.reason}</MatchReason>}

            {next.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border-base pt-4">
                {next.map((status) => {
                  const a = ACTION[status as keyof typeof ACTION];
                  return (
                    <ActionForm
                      key={status}
                      action={updateApplicationStatus}
                      success={a?.done ?? 'Updated'}
                    >
                      <input type="hidden" name="applicationId" value={c.id} />
                      <input type="hidden" name="status" value={status} />
                      <SubmitButton
                        size="sm"
                        variant={a?.variant ?? 'secondary'}
                        pendingLabel="Saving…"
                      >
                        {a?.label ?? status}
                      </SubmitButton>
                    </ActionForm>
                  );
                })}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
