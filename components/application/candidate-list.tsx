import Link from 'next/link';

import { MatchReason } from '@/components/matches/match-items';
import { ContactDialog } from '@/components/messaging/contact-dialog';
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
   * Why this applicant fits, from the cached ranking, NOT from a column on `applications`.
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
    accepts_messages: boolean;
  } | null;
};

const ACTION = {
  viewed: { label: 'Mark as viewed', done: 'Marked as viewed', variant: 'ghost' },
  shortlisted: { label: 'Shortlist', done: 'Shortlisted', variant: 'secondary' },
  rejected: { label: 'Not a fit', done: 'Marked as not a fit', variant: 'danger-ghost' },
  hired: { label: 'Hire', done: 'Marked as hired', variant: 'primary' },
} as const;

/** Forward steps first, the step that ends the application last and set apart. */
const ORDER = ['hired', 'shortlisted', 'viewed', 'rejected'];
const rank = (s: string) => {
  const i = ORDER.indexOf(s);
  return i === -1 ? ORDER.length : i;
};

/**
 * The client's application inbox.
 *
 * Deliberately shows NO numeric match score (ADR-007 D2): ordering and the written reason
 * only. A number attached to a person reads as a verdict this system cannot justify, and it
 * penalises thin profiles for a data gap rather than for ability.
 *
 * Each applicant is a card because each one is a decision with its own actions: the card is
 * the unit a client works through. The available actions come from `allowedStatusTransitions`,
 * so the UI cannot offer a transition the action would refuse. Rendering a button that fails on
 * click is worse than not rendering it. Each change confirms with a toast: the badge updates in
 * place, which is easy to miss after a click further down the card.
 */
export function CandidateList({
  candidates,
  job,
}: {
  candidates: Candidate[];
  /** The job these applied to: a message from here is about it. */
  job: { id: string; title: string };
}) {
  return (
    <ul className="space-y-3">
      {candidates.map((c) => {
        const next = [
          ...(allowedStatusTransitions.client[
            c.status as keyof typeof allowedStatusTransitions.client
          ] as readonly string[]),
        ].sort((a, b) => rank(a) - rank(b));
        const profile = c.talent_profiles;
        const evidence = profile
          ? profile.portfolio_item_count > 0
            ? `${profile.portfolio_item_count} project${profile.portfolio_item_count === 1 ? '' : 's'}`
            : profile.website_url
              ? 'Portfolio site'
              : 'No evidence yet'
          : null;

        return (
          <li
            key={c.id}
            className="rounded-lg border border-border-base bg-surface-raised p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <Avatar name={profile?.headline ?? 'Removed'} className="hidden sm:grid" />
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
                  <p className="mt-0.5 text-sm text-text-subtle tabular-nums">
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

            <p className="mt-4 max-w-[65ch] text-sm leading-relaxed whitespace-pre-line text-text-muted text-pretty">
              {c.cover_note}
            </p>

            {c.reason && <MatchReason className="mt-4">{c.reason}</MatchReason>}

            {(next.length > 0 || profile?.accepts_messages) && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border-base pt-4">
                {/* Message an applicant about this job. Continues an existing conversation if
                    there is one (startConversation reuses it). Hidden when they turned new
                    messages off; the database would refuse it anyway. */}
                {profile?.accepts_messages && (
                  <ContactDialog
                    talentId={c.talent_id}
                    talentHeadline={profile.headline}
                    jobs={[job]}
                    defaultJobId={job.id}
                    trigger="compact"
                  />
                )}
                {next.map((status) => {
                  const a = ACTION[status as keyof typeof ACTION];
                  return (
                    <ActionForm
                      key={status}
                      action={updateApplicationStatus}
                      success={a?.done ?? 'Updated'}
                      className={status === 'rejected' ? 'sm:ml-auto' : undefined}
                    >
                      <input type="hidden" name="applicationId" value={c.id} />
                      <input type="hidden" name="status" value={status} />
                      <SubmitButton
                        size="sm"
                        // 40px touch target on phones; the compact 36px from sm up.
                        className="min-h-10 sm:min-h-0"
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
