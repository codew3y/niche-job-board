import { ArrowRight, Bookmark, Briefcase, Hourglass, Inbox, Plus, UsersRound } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';

import { JobStatusBadge } from '@/components/job/job-status-badge';
import { CandidateMatchItem } from '@/components/matches/match-items';
import { buttonStyles } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/shared/skeleton';
import { Stat } from '@/components/ui/stat';
import { suggestedForJob } from '@/lib/services/matches';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * The client's home: their briefs, what has come in, and who fits.
 *
 * FIXED HERE (DESIGN.md §1, A3 and A5): the only action offered to a client with no jobs linked
 * to `/client/jobs/new`, which 404'd; and the jobs list was plain text — titles that could not
 * be clicked beside a raw lowercase status. "Top candidates", the reason a client opens this
 * page, was two clicks deep. It is now on the page, for the brief posted most recently.
 */
export default async function ClientDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id, company_name')
    .eq('user_id', user!.id)
    .maybeSingle();

  const { data: jobs } = client
    ? await supabase
        .from('jobs')
        .select('id, title, slug, status')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    : { data: null };

  const ids = (jobs ?? []).map((j) => j.id);
  const [{ data: apps }, saved] = await Promise.all([
    ids.length
      ? supabase.from('applications').select('job_id, status, talent_id').in('job_id', ids)
      : Promise.resolve({ data: [] as { job_id: string; status: string; talent_id: string }[] }),
    client
      ? supabase
          .from('saved_talent')
          .select('talent_id', { count: 'exact', head: true })
          .eq('client_id', client.id)
      : Promise.resolve({ count: 0 }),
  ]);

  const live = (apps ?? []).filter((a) => a.status !== 'withdrawn');
  const perJob = new Map<string, number>();
  for (const a of live) perJob.set(a.job_id, (perJob.get(a.job_id) ?? 0) + 1);
  const toReview = live.filter((a) => a.status === 'applied').length;
  const open = (jobs ?? []).filter((j) => j.status === 'open');

  // Top candidates for the newest open brief — people who fit and have NOT applied, because
  // applicants already appear on that job's page and showing someone twice looks broken.
  const focus = open[0] ?? null;
  const applicantIds = focus
    ? (apps ?? []).filter((a) => a.job_id === focus.id).map((a) => a.talent_id)
    : [];

  return (
    <div>
      <PageHeader
        eyebrow={client?.company_name ?? 'Your company'}
        title="Your hiring"
        subtitle={
          client?.company_name
            ? 'Briefs you have posted, what has come in, and who fits.'
            : 'Finish setting up your company profile to start posting.'
        }
        actions={
          <Link href="/dashboard/client/jobs/new" className={buttonStyles({ variant: 'accent' })}>
            <Plus aria-hidden="true" />
            Post a job
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Open jobs"
          value={open.length}
          icon={Briefcase}
          href="/dashboard/client/jobs"
        />
        <Stat label="Applications" value={live.length} icon={Inbox} href="/dashboard/client/jobs" />
        <Stat
          label="To review"
          value={toReview}
          icon={UsersRound}
          emphasis={toReview > 0}
          href="/dashboard/client/jobs"
        />
        <Stat
          label="Saved developers"
          value={saved.count ?? 0}
          icon={Bookmark}
          href="/dashboard/client/saved"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader
            title="Your jobs"
            action={
              jobs?.length ? (
                <Link
                  href="/dashboard/client/jobs"
                  className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                >
                  Manage <ArrowRight aria-hidden="true" size={14} />
                </Link>
              ) : null
            }
          />
          {jobs?.length ? (
            <ul className="divide-y divide-border-base">
              {jobs.slice(0, 6).map((job) => {
                const n = perJob.get(job.id) ?? 0;
                return (
                  <li
                    key={job.id}
                    className="relative flex items-center justify-between gap-4 px-5 py-4 hover:bg-surface-sunken/50"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/client/jobs/${job.id}`}
                        className="font-semibold after:absolute after:inset-0 hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-text-subtle">
                        {n} {n === 1 ? 'application' : 'applications'}
                      </p>
                    </div>
                    <JobStatusBadge status={job.status} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="p-2">
              <EmptyState
                className="border-0"
                icon={Briefcase}
                title="No jobs posted yet"
                body="Post a brief and we’ll rank candidates against the work they’ve actually shipped."
                action={
                  <Link href="/dashboard/client/jobs/new" className={buttonStyles({ size: 'sm' })}>
                    Post a job
                  </Link>
                }
              />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Top candidates"
              description={
                focus ? <>For &ldquo;{focus.title}&rdquo;</> : 'For your newest open brief'
              }
            />
            {!focus ? (
              <p className="px-5 py-6 text-sm text-text-muted">
                Publish a brief and the developers who fit it appear here — including people who
                have not applied.
              </p>
            ) : (
              // Streams in after the rest of the page: the dashboard never waits on the match
              // cache, and a skeleton holds the card's space so nothing shifts when it lands.
              <Suspense
                fallback={
                  <div
                    role="status"
                    aria-busy="true"
                    aria-label="Loading candidates"
                    className="space-y-4 p-5"
                  >
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="flex gap-3.5">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                }
              >
                <TopCandidates jobId={focus.id} exclude={applicantIds} />
              </Suspense>
            )}
          </Card>

          <nav aria-label="Quick links">
            <Card className="divide-y divide-border-base">
              {(
                [
                  ['/dashboard/client/saved', 'Saved developers', 'Private to you'],
                  ['/browse?type=developers', 'Browse developers', 'Everyone who is listed'],
                  ['/dashboard/client/profile', 'Company profile', 'Shown on every job you post'],
                ] as const
              ).map(([href, label, hint]) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center justify-between gap-3 px-5 py-3.5 transition-colors duration-fast ease-out first:rounded-t-lg last:rounded-b-lg hover:bg-surface-sunken/60"
                >
                  <span>
                    <span className="block text-sm font-semibold">{label}</span>
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

async function TopCandidates({ jobId, exclude }: { jobId: string; exclude: string[] }) {
  const suggested = await suggestedForJob(jobId, exclude, 3);

  if (suggested.state === 'ready') {
    return (
      <ul className="divide-y divide-border-base">
        {suggested.matches.map((m) => (
          <CandidateMatchItem key={m.talentId} match={m} />
        ))}
      </ul>
    );
  }
  if (suggested.state === 'pending') {
    return (
      <p className="flex gap-2.5 px-5 py-6 text-sm text-text-muted">
        <Hourglass aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-accent" />
        Still matching this brief against every published profile. It lands within the hour —
        nothing is wrong.
      </p>
    );
  }
  if (suggested.state === 'too-sparse') {
    return (
      <p className="px-5 py-6 text-sm text-text-muted">
        Not enough in the brief to match on.{' '}
        <Link href={`/dashboard/client/jobs/${jobId}/edit`} className="prose-link font-semibold">
          Add to the description
        </Link>{' '}
        — it is the same text a developer reads before applying.
      </p>
    );
  }
  return (
    <p className="px-5 py-6 text-sm text-text-muted">
      Nobody strong enough to suggest yet. We&rsquo;d rather show nothing than pad this with
      developers who don&rsquo;t fit.
    </p>
  );
}
