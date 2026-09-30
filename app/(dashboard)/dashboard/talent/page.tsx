import {
  ArrowRight,
  Bookmark,
  Briefcase,
  CheckCircle2,
  Circle,
  FolderKanban,
  Hourglass,
  SearchX,
  Sparkles,
  Star,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { TalentMatchItem } from '@/components/matches/match-items';
import { Badge } from '@/components/ui/badge';
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
 * The developer's home (DESIGN.md §3.1): the display face once, for the greeting; a summary
 * row; the matches list as the primary content; profile status and shortcuts beside it on wide
 * screens and below it on a phone.
 *
 * TWO DEFECTS FIXED HERE (DESIGN.md §1, A2 and A4):
 *   - the "Matches" section was a hard-coded empty state, so a developer with ten strong matches
 *     was told they had none. It now reads the same `matchesForMe()` the matches page reads, and
 *     says the four different true things that feed can say;
 *   - the unpublished nudge linked to `/talent/profile`, a PUBLIC profile slug, which 404'd.
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

  // Mirrors the publish checklist and profileSuggestions(): named, specific, never a percentage
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

  const published = Boolean(profile?.is_published);
  const todo = checks.filter((c) => !c.done).length;

  return (
    <div>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        subtitle={
          published
            ? 'Jobs that fit what you have shipped, and where your applications stand.'
            : 'Finish your profile and publish it to start getting matched.'
        }
        actions={
          // The one primary on the page: browsing once the profile is live. While it is a
          // draft, "Finish your profile" (in the profile panel) is the primary instead.
          <Link
            href="/browse?type=jobs"
            className={buttonStyles({ variant: published ? 'primary' : 'secondary' })}
          >
            Browse jobs
          </Link>
        }
      />

      {/* Below lg the app rail takes 4rem, so a 360px phone leaves ~264px of content: too
          narrow for two tiles whose labels cannot wrap ("Applications"). One column there, a
          2x2 grid from a 416px viewport, one row of four from lg. */}
      <div className="grid grid-cols-1 gap-3 min-[26rem]:grid-cols-2 lg:grid-cols-4">
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

      {/* Phone and tablet: one column, matches first. From lg: matches beside a narrow aside. */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* The one card with a header on the page: matches are the primary content. */}
        <Card>
          <CardHeader
            title="Your matches"
            description="Ranked by how well your work fits, with the reason."
            action={
              feed?.state === 'ready' ? (
                <Link
                  href="/dashboard/talent/matches"
                  className="inline-flex h-10 items-center gap-1 text-sm font-semibold text-link hover:underline"
                >
                  See all <ArrowRight aria-hidden="true" size={14} />
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
                body="Matching reads your bio and the projects you have added. A few sentences on what you build and one piece of work is usually enough to start."
                action={
                  <Link
                    href="/dashboard/talent/profile#projects"
                    className={buttonStyles({ variant: 'secondary' })}
                  >
                    Add a project
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
                body="Matches are calculated in the background and usually land here within the hour. Nothing is wrong. There is just nothing to show yet."
              />
            </div>
          ) : feed.state === 'empty' ? (
            <div className="p-2">
              <EmptyState
                className="border-0"
                icon={SearchX}
                title="No strong matches yet"
                body="We would rather show nothing than pad this with jobs that do not fit. New jobs are posted regularly, and this list updates on its own."
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

        <div className="space-y-8">
          <section
            aria-labelledby="profile-status"
            className="rounded-lg border border-border-base bg-surface-raised p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h2 id="profile-status" className="font-semibold tracking-tight">
                Your profile
              </h2>
              <Badge tone={published ? 'success' : 'outline'}>{published ? 'Live' : 'Draft'}</Badge>
            </div>
            <p className="mt-1 text-sm text-text-muted tabular-nums">
              {todo === 0
                ? 'Everything a client looks for is there.'
                : `${todo} of ${checks.length} still to do.`}
            </p>
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
                  <span className={c.done ? 'text-text-muted' : 'font-semibold text-text'}>
                    {c.label}
                  </span>
                  <span className="sr-only">{c.done ? '(done)' : '(to do)'}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col gap-2">
              <Link
                href="/dashboard/talent/profile"
                className={buttonStyles({
                  variant: published ? 'secondary' : 'primary',
                  className: 'w-full',
                })}
              >
                {published ? 'Edit profile' : 'Finish your profile'}
              </Link>
              {published && profile?.slug && (
                <Link
                  href={`/talent/${profile.slug}`}
                  className="inline-flex h-10 items-center justify-center text-sm font-semibold text-link hover:underline"
                >
                  View public page
                </Link>
              )}
            </div>
          </section>

          {/* Matches and Saved left the top navigation when it was restructured around
              intentions rather than features. They are linked here instead, which is where
              someone goes looking for them. A plain ruled list, not a card: these are links,
              and a box would give them the weight of content. */}
          <nav aria-label="Quick links">
            <ul className="divide-y divide-border-base border-y border-border-base">
              {(
                [
                  ['/dashboard/talent/matches', 'Your matches', 'Everything that fits, ranked'],
                  ['/dashboard/talent/saved', 'Saved jobs', 'Private to you'],
                  ['/dashboard/talent/portfolio', 'Portfolio', 'The projects clients read first'],
                ] as const
              ).map(([href, label, hint]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex min-h-14 items-center justify-between gap-3 px-1 py-3 transition-colors duration-fast ease-out hover:bg-surface-sunken/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-text">{label}</span>
                      <span className="block text-sm text-text-muted">{hint}</span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      size={16}
                      className="shrink-0 text-text-subtle transition-transform duration-fast ease-out group-hover:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
