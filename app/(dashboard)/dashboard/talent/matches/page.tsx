import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { formatRange, ENGAGEMENT_LABEL, LOCATION_LABEL } from '@/components/shared/money';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { matchesForMe, STRONG_MATCH_SCORE } from '@/lib/services/matches';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Matches' };

/**
 * Briefs that fit what this developer has shipped.
 *
 * Reads the warm cache and never computes. Each state below says something different and
 * true — "not ready yet" is not the same as "nothing fits", and collapsing them into one
 * empty state would tell someone their work matches nothing when the truth is the scheduler
 * has not reached them.
 */
export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, is_published, bio, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const feed = await matchesForMe(profile.id);

  return (
    <div>
      <PageHeader
        title="Matches"
        subtitle="Briefs that fit what you've shipped — ranked by how well, with the reason."
      />

      {!profile.is_published && (
        <p className="mb-6 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm text-pretty">
          Your profile is a draft, so clients cannot find you. Matching still runs, but nobody sees
          the result but you.{' '}
          <Link href="/dashboard/talent/profile" className="prose-link font-medium">
            Publish it
          </Link>
        </p>
      )}

      {feed.state === 'too-sparse' && (
        <EmptyState
          title="Not enough to match on yet"
          body="Matching reads your bio and the projects you've added. There isn't enough there yet to tell a client anything — a few sentences on what you build, and one piece of work, is usually enough to start."
          action={
            <Link href="/dashboard/talent/profile" className="text-sm underline">
              Fill in your profile
            </Link>
          }
        />
      )}

      {feed.state === 'pending' && (
        <EmptyState
          title="Working out what fits"
          body="Matches are calculated in the background and land here shortly — usually within the hour. Nothing is wrong; there is just nothing to show yet."
          action={
            <Link href="/jobs" className="text-sm underline">
              Browse jobs meanwhile
            </Link>
          }
        />
      )}

      {feed.state === 'empty' && (
        // Story S4: say "no strong matches" rather than padding the list with bad ones.
        <EmptyState
          title="No strong matches yet"
          body="We'd rather show nothing than pad this with briefs that don't fit. New jobs are posted regularly, and this updates on its own."
          action={
            <Link href="/jobs" className="text-sm underline">
              Browse everything
            </Link>
          }
        />
      )}

      {feed.state === 'ready' && (
        <ul className="divide-y divide-border-base rounded-md border border-border-base">
          {feed.matches.map((match) => {
            const budget = formatRange(
              match.budgetMin,
              match.budgetMax,
              match.currency,
              match.engagementType === 'hourly' ? '/hr' : '',
            );
            const strong = match.score !== null && match.score >= STRONG_MATCH_SCORE;

            return (
              <li key={match.jobId} className="p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="text-base font-medium">
                    <Link href={`/jobs/${match.slug}`} className="hover:text-accent">
                      {match.title}
                    </Link>
                  </h2>
                  <div className="flex items-center gap-3">
                    {budget && <span className="text-sm font-medium tabular-nums">{budget}</span>}
                    {/*
                      The developer sees their OWN score on their OWN matches (ADR-007 D2).
                      Null means the ranking came from vectors alone because the re-ranker was
                      unavailable — the order is real, the number would not be, so none is
                      shown rather than a fabricated one.
                    */}
                    {match.score !== null && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${
                          strong
                            ? 'bg-accent-subtle text-accent'
                            : 'bg-surface-sunken text-text-muted'
                        }`}
                      >
                        {match.score}
                        <span className="sr-only"> out of 100 match score</span>
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-1 text-sm text-text-muted">
                  {match.companyName ?? 'A client'}
                  <span className="mx-1.5 text-text-subtle">·</span>
                  {LOCATION_LABEL[match.locationType] ?? match.locationType}
                  <span className="mx-1.5 text-text-subtle">·</span>
                  {ENGAGEMENT_LABEL[match.engagementType] ?? match.engagementType}
                </p>

                {match.reason && (
                  <p className="mt-2 border-l-2 border-accent/40 pl-3 text-sm text-pretty">
                    {match.reason}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
