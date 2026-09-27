import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Circle,
  FolderKanban,
  Hourglass,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { TalentMatchItem } from '@/components/matches/match-items';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Stat } from '@/components/ui/stat';
import { matchesForMe } from '@/lib/services/matches';
import { getSessionProfile } from '@/lib/supabase/session';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * The developer's home — the direction's dashboard (DESIGN.md §3.1): the serif once, for the
 * greeting; a summary row; the matches list as the primary content; profile and shortcuts
 * beside it on wide screens.
 *
 * TWO DEFECTS FIXED HERE (DESIGN.md §1, A2 and A4):
 *   - the "Matches" section was a hard-coded empty state, so a developer with ten strong matches
 *     was told they had none. It now reads the same `matchesForMe()` the matches page reads, and
 *     says the four different true things that feed can say;
 *   - the unpublished nudge linked to `/talent/profile` — a PUBLIC profile slug, which 404'd.
 *
 * Every number links to the page that explains it.
 */
export default async function TalentDashboard() {
  const supabase = await createClient();
  const session = await getSessionProfile();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, slug, headline, is_published, portfolio_item_count, website_url, bio')
    .eq('user_id', user!.id)
    .maybeSingle();

  const [feed, applications, saved, skills] = profile
    ? await Promise.all([
        matchesForMe(profile.id),
        supabase.from('applications').select('status').eq('talent_id', profile.id),
        supabase
          .from('saved_jobs')
          .select('job_id', { count: 'exact', head: true })
          .eq('talent_id', profile.id),
        supabase
          .from('talent_skills')
          .select('skill_id', { count: 'exact', head: true })
          .eq('talent_id', profile.id),
      ])
    : [null, null, null, null];

  const statuses = (applications?.data ?? []).map((a) => a.status);
  const active = statuses.filter((s) => s !== 'withdrawn').length;
  const shortlisted = statuses.filter((s) => s === 'shortlisted' || s === 'hired').length;
  const firstName = session?.displayName?.split(' ')[0];

  // Mirrors the publish checklist and profileSuggestions() — named, specific, never a percentage
  // that implies a grade.
  const checks = [
    {
      label: 'Headline and a bio of a few sentences',
      done: Boolean(profile?.headline && (profile?.bio?.length ?? 0) >= 120),
    },
    { label: 'Skills tagged', done: (skills?.count ?? 0) > 0 },
    {
      label: 'A portfolio site or two projects',
      done: Boolean(profile?.website_url) || (profile?.portfolio_item_count ?? 0) >= 2,
    },
    { label: 'Published', done: Boolean(profile?.is_published) },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={profile?.is_published ? 'Your profile is live' : 'Draft profile'}
        title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        subtitle={
          profile?.is_published
            ? 'Briefs that fit what you have shipped, and where your applications stand.'
            : 'Finish your profile and publish it to start getting matched.'
        }
        actions={
          <Link href="/jobs" className={buttonStyles({ variant: 'secondary' })}>
            Browse jobs
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Applications"
          value={active}
          icon={Briefcase}
          href="/dashboard/talent/applications"
        />
        <Stat
          label="Shortlisted"
          value={shortlisted}
          icon={Star}
          emphasis={shortlisted > 0}
          href="/dashboard/talent/applications"
        />
        <Stat
          label="Saved jobs"
          value={saved?.count ?? 0}
          icon={Bookmark}
          href="/dashboard/talent/saved"
        />
        <Stat
          label="Projects"
          value={profile?.portfolio_item_count ?? 0}
          icon={FolderKanban}
          href="/dashboard/talent/portfolio"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader
            title="Your matches"
            description="Ranked by how well your work fits, with the reason."
            action={
              feed?.state === 'ready' ? (
                <Link
                  href="/dashboard/talent/matches"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                >
                  View all <ArrowRight aria-hidden="true" size={14} />
                </Link>
              ) : null
            }
          />
          {!feed || feed.state === 'too-sparse' ? (
            <div className="p-2">
              <EmptyState
                className="border-0"
                icon={Sparkles}
                title="Not enough to match on yet"
                body="Matching reads your bio and the projects you’ve added. A few sentences on what you build and one piece of work is usually enough to start."
                action={
                  <Link href="/dashboard/talent/profile" className={buttonStyles({ size: 'sm' })}>
                    Fill in your profile
                  </Link>
                }
              />
            </div>
          ) : feed.state === 'pending' ? (
            <div className="p-2">
              <EmptyState
                className="border-0"
                icon={Hourglass}
                tone="pending"
                title="Working out what fits"
                body="Matches are calculated in the background and land here shortly — usually within the hour. Nothing is wrong; there is just nothing to show yet."
              />
            </div>
          ) : feed.state === 'empty' ? (
            <div className="p-2">
              <EmptyState
                className="border-0"
                title="No strong matches yet"
                body="We’d rather show nothing than pad this with briefs that don’t fit. New jobs are posted regularly, and this updates on its own."
                action={
                  <Link href="/jobs" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                    Browse everything
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border-base">
              {feed.matches.slice(0, 3).map((m) => (
                <TalentMatchItem key={m.jobId} match={m} />
              ))}
            </ul>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-semibold tracking-tight">Your profile</h2>
              {profile?.is_published && profile.slug && (
                <Link href={`/talent/${profile.slug}`} className="prose-link text-sm">
                  View public page
                </Link>
              )}
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5">
                  {c.done ? (
                    <CheckCircle2
                      aria-hidden="true"
                      size={17}
                      className="mt-0.5 shrink-0 text-success"
                    />
                  ) : (
                    <Circle
                      aria-hidden="true"
                      size={17}
                      className="mt-0.5 shrink-0 text-text-subtle"
                    />
                  )}
                  <span className={c.done ? 'text-text-muted' : 'font-medium'}>{c.label}</span>
                  <span className="sr-only">{c.done ? '(done)' : '(to do)'}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/talent/profile"
              className={buttonStyles({
                variant: profile?.is_published ? 'secondary' : 'primary',
                size: 'sm',
                className: 'mt-5 w-full',
              })}
            >
              {profile?.is_published ? 'Edit profile' : 'Finish your profile'}
            </Link>
          </Card>

          {/* Matches and Saved left the top navigation when it was restructured around
              intentions rather than features. They are linked here instead, which is where
              someone goes looking for them. */}
          <nav aria-label="Quick links">
            <Card className="divide-y divide-border-base">
              {(
                [
                  ['/dashboard/talent/matches', 'Your matches', 'Everything that fits, ranked'],
                  ['/dashboard/talent/saved', 'Saved jobs', 'Private to you'],
                  ['/dashboard/talent/portfolio', 'Portfolio', 'The projects clients read first'],
                ] as const
              ).map(([href, label, hint]) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-fast ease-out first:rounded-t-lg last:rounded-b-lg hover:bg-surface-sunken/60"
                >
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-text-subtle">{hint}</span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    size={16}
                    className="text-text-subtle transition-transform duration-fast ease-out group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </Card>
          </nav>
        </div>
      </div>
    </div>
  );
}
