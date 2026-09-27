import Link from 'next/link';
import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function TalentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('headline, is_published, portfolio_item_count, website_url, bio')
    .eq('user_id', user!.id)
    .maybeSingle();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-text-muted">
          {profile?.is_published
            ? 'Your profile is live and can be matched to briefs.'
            : 'Finish your profile to start getting matched.'}
        </p>
      </div>

      {!profile?.is_published && (
        <EmptyState
          title="Your profile isn’t published yet"
          body={
            // Names the actual blocker rather than saying "incomplete" — the same rule the
            // publish gate follows (lib/schemas/talent.ts).
            !profile
              ? 'Start by adding a headline and a few lines about what you build.'
              : !profile.bio
                ? 'Add a bio — it’s the text matching actually reads.'
                : profile.website_url || profile.portfolio_item_count >= 2
                  ? 'You have everything you need. Publish when you’re ready.'
                  : `Add ${2 - profile.portfolio_item_count} more project${profile.portfolio_item_count === 1 ? '' : 's'}, or link your portfolio site.`
          }
          action={
            <Link href="/talent/profile" className="prose-link font-medium">
              Go to profile
            </Link>
          }
        />
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Matches</h2>
        <EmptyState
          title="No matches yet"
          body="Once your profile is published we’ll surface briefs that fit what you’ve shipped. We’d rather show nothing than pad the list."
        />
      </section>

      {/* Matches and Saved left the top navigation when it was restructured around
          intentions rather than features. They are linked here instead, which is where
          someone goes looking for them. */}
      <nav aria-label="Quick links" className="mt-10 border-t border-border-base pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/dashboard/talent/matches" className="prose-link font-medium">
              Your matches
            </Link>
          </li>
          <li>
            <Link href="/dashboard/talent/saved" className="prose-link font-medium">
              Saved jobs
            </Link>
          </li>
          <li>
            <Link href="/dashboard/talent/portfolio" className="prose-link font-medium">
              Portfolio
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
