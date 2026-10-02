import {
  Hourglass,
  MagnifyingGlassMinus as SearchX,
  Sparkle as Sparkles,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { TalentMatchItem } from '@/components/matches/match-items';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { matchesForMe } from '@/lib/services/matches';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Matches' };

/**
 * Briefs that fit what this developer has shipped.
 *
 * Reads the warm cache and never computes. Each state below says something different and
 * true: "not ready yet" is not the same as "nothing fits", and collapsing them into one
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
    <div className="max-w-3xl">
      <PageHeader
        title="Matches"
        subtitle={
          feed.state === 'ready' ? (
            <span className="tabular-nums">
              {feed.matches.length} {feed.matches.length === 1 ? 'job fits' : 'jobs fit'} what you
              have shipped, best fit first, each with the reason.
            </span>
          ) : (
            'Jobs that fit what you have shipped, best fit first, each with the reason.'
          )
        }
      />

      {!profile.is_published && (
        <p
          role="status"
          className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-warning-subtle px-4 py-3 text-sm text-text"
        >
          <span>
            Your profile is a draft, so clients cannot find you. Matching still runs, but only you
            see the results.
          </span>
          <Link href="/dashboard/talent/profile" className="prose-link font-semibold">
            Publish your profile
          </Link>
        </p>
      )}

      {feed.state === 'too-sparse' && (
        <EmptyState
          icon={Sparkles}
          title="Not enough to match on yet"
          body="Matching reads your bio and the projects you have added, and there is not enough there yet to tell a client anything. A few sentences on what you build and one piece of work is usually enough to start."
          action={
            <Link href="/dashboard/talent/profile" className={buttonStyles()}>
              Finish your profile
            </Link>
          }
        />
      )}

      {feed.state === 'pending' && (
        <EmptyState
          icon={Hourglass}
          tone="pending"
          title="Working out what fits"
          body="Matches are calculated in the background and usually land here within the hour. Nothing is wrong. There is just nothing to show yet."
          action={
            <Link href="/browse?type=jobs" className={buttonStyles({ variant: 'secondary' })}>
              Browse jobs
            </Link>
          }
        />
      )}

      {feed.state === 'empty' && (
        // Story S4: say "no strong matches" rather than padding the list with bad ones.
        <EmptyState
          icon={SearchX}
          title="No strong matches yet"
          body="We would rather show nothing than pad this with jobs that do not fit. New jobs are posted regularly, and this list updates on its own."
          action={
            <Link href="/browse?type=jobs" className={buttonStyles({ variant: 'secondary' })}>
              Browse jobs
            </Link>
          }
        />
      )}

      {feed.state === 'ready' && (
        <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
          {feed.matches.map((match) => (
            <TalentMatchItem key={match.jobId} match={match} />
          ))}
        </ul>
      )}
    </div>
  );
}
