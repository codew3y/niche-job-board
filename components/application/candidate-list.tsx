import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { updateApplicationStatus } from '@/lib/actions/applications';
import { allowedStatusTransitions } from '@/lib/schemas/enums';

type Candidate = {
  id: string;
  status: string;
  cover_note: string;
  created_at: string;
  match_reason: string | null;
  talent_profiles: {
    slug: string;
    headline: string;
    portfolio_item_count: number;
    website_url: string | null;
  } | null;
};

const ACTION_LABEL: Record<string, string> = {
  viewed: 'Mark as viewed',
  shortlisted: 'Shortlist',
  rejected: 'Not a fit',
  hired: 'Hire',
};

/**
 * The client's application inbox.
 *
 * Deliberately shows NO numeric match score (ADR-007 D2) — ordering and the written reason
 * only. A number attached to a person reads as a verdict this system cannot justify, and it
 * penalises thin profiles for a data gap rather than for ability.
 *
 * The available actions come from `allowedStatusTransitions`, so the UI cannot offer a
 * transition the action would refuse. Rendering a button that fails on click is worse than
 * not rendering it.
 */
export function CandidateList({ candidates }: { candidates: Candidate[] }) {
  return (
    <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
      {candidates.map((c) => {
        const next = allowedStatusTransitions.client[
          c.status as keyof typeof allowedStatusTransitions.client
        ] as readonly string[];
        const profile = c.talent_profiles;

        return (
          <li key={c.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium">
                  {profile ? (
                    <Link href={`/talent/${profile.slug}`} className="hover:text-accent">
                      {profile.headline}
                    </Link>
                  ) : (
                    'Profile removed'
                  )}
                </h3>
                {profile && (
                  <p className="mt-0.5 text-sm text-text-subtle">
                    {profile.portfolio_item_count > 0
                      ? `${profile.portfolio_item_count} project${profile.portfolio_item_count === 1 ? '' : 's'}`
                      : profile.website_url
                        ? 'Portfolio site'
                        : 'No evidence'}
                  </p>
                )}
              </div>
              <StatusBadge status={c.status} />
            </div>

            <p className="mt-3 whitespace-pre-line text-sm text-text-muted text-pretty">
              {c.cover_note}
            </p>

            {c.match_reason && (
              <p className="mt-2 border-l-2 border-accent/40 pl-3 text-sm text-pretty">
                {c.match_reason}
              </p>
            )}

            {next.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {next.map((status) => (
                  <form key={status} action={updateApplicationStatus}>
                    <input type="hidden" name="applicationId" value={c.id} />
                    <input type="hidden" name="status" value={status} />
                    <Button
                      type="submit"
                      size="sm"
                      variant={
                        status === 'rejected'
                          ? 'ghost'
                          : status === 'hired'
                            ? 'primary'
                            : 'secondary'
                      }
                      className={status === 'rejected' ? 'text-danger' : ''}
                    >
                      {ACTION_LABEL[status] ?? status}
                    </Button>
                  </form>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
