import {
  ArrowRight,
  BookmarkSimple as Bookmark,
  Briefcase,
  Hourglass,
  Tray as Inbox,
  Plus,
  Users as UsersRound,
} from '@phosphor-icons/react/ssr';
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
import { suggestedForJob } from '@techselect/backend/services/matches';
import { createClient } from '@techselect/backend/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

/**
 * The client's home: their briefs, what has come in, and who fits.
 *
 * FIXED HERE: the only action offered to a client with no jobs linked
 * to `/client/jobs/new`, which 404'd; and the jobs list was plain text, titles that could not
 * be clicked beside a raw lowercase status. "Top candidates", the reason a client opens this
 * page, was two clicks deep. It is now on the page, for the brief posted most recently.
 *
 * LOADING — no `loading.tsx` can sit above this page (it would wrap jobs/[id], which has a
 * notFound(); see saved/loading.tsx). The heading renders from the one-row company lookup, and
 * everything else streams behind a skeleton of the same shape. Top candidates stream again,
 * separately, because the match cache is the slowest thing on the page.
 *
 * ONE PRIMARY ACTION: "Post a job" in the header. Empty states below point at it rather than
 * repeating it.
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

  return (
    <div>
      <PageHeader
        eyebrow={client?.company_name ?? undefined}
        title="Your hiring"
        subtitle={
          client?.company_name
            ? 'Briefs you have posted, what has come in, and who fits.'
            : 'Add the name developers will see, then post your first brief.'
        }
        actions={
          client ? (
            <Link href="/dashboard/client/jobs/new" className={buttonStyles()}>
              <Plus aria-hidden="true" />
              Post a job
            </Link>
          ) : (
            <Link href="/onboarding/client/company" className={buttonStyles()}>
              Set up company
            </Link>
          )
        }
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody client={client} />
      </Suspense>
    </div>
  );
}

async function DashboardBody({ client }: { client: { id: string; company_name: string } | null }) {
  const supabase = await createClient();

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

  // Top candidates for the newest open brief: people who fit and have NOT applied, because
  // applicants already appear on that job's page and showing someone twice looks broken.
  const focus = open[0] ?? null;
  const applicantIds = focus
    ? (apps ?? []).filter((a) => a.job_id === focus.id).map((a) => a.talent_id)
    : [];

  return (
    <>
      {/* Phone: two by two. From lg: one row of four. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          tone="blue"
          label="Open jobs"
          value={open.length}
          icon={Briefcase}
          href="/dashboard/client/jobs"
        />
        <Stat
          tone="teal"
          label="Applications"
          value={live.length}
          icon={Inbox}
          href="/dashboard/client/jobs"
        />
        <Stat
          tone="amber"
          label="To review"
          value={toReview}
          icon={UsersRound}
          emphasis={toReview > 0}
          href="/dashboard/client/jobs"
        />
        <Stat
          tone="violet"
          label="Saved developers"
          value={saved.count ?? 0}
          icon={Bookmark}
          href="/dashboard/client/saved"
        />
      </div>

      {/* One column until xl, where the content area is wide enough for two readable ones. */}
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        <Card>
          <CardHeader
            title="Your jobs"
            action={
              jobs?.length ? (
                <Link
                  href="/dashboard/client/jobs"
                  className="-my-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-link hover:underline"
                >
                  Manage jobs <ArrowRight aria-hidden="true" size={14} />
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
                    className="relative flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-fast ease-out last:rounded-b-lg hover:bg-surface-sunken/50"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/client/jobs/${job.id}`}
                        className="block truncate font-semibold after:absolute after:inset-0 hover:underline"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-text-subtle tabular-nums">
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
                body={
                  client
                    ? 'Use Post a job to write your first brief. We rank developers against the work they have actually shipped.'
                    : 'Once you have added the name developers will see, you can post your first brief.'
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
              <p className="px-5 py-6 text-sm text-text-muted text-pretty">
                Publish a brief and the developers who fit it appear here, including people who have
                not applied.
              </p>
            ) : (
              // Streams in after the rest of the page: the dashboard never waits on the match
              // cache, and a skeleton holds the card's space so nothing shifts when it lands.
              <Suspense fallback={<CandidatesSkeleton />}>
                <TopCandidates jobId={focus.id} exclude={applicantIds} />
              </Suspense>
            )}
          </Card>

          {/* A plain ruled list, not a card, as on the talent dashboard: these are links, and a
              box would give them the weight of content. */}
          <nav aria-label="Quick links">
            <ul className="divide-y divide-border-base border-y border-border-base">
              {(
                [
                  ['/dashboard/client/saved', 'Saved developers', 'Private to you'],
                  ['/browse?type=developers', 'Browse developers', 'Everyone who is listed'],
                  ['/dashboard/client/profile', 'Client profile', 'Shown on every job you post'],
                ] as const
              ).map(([href, label, hint]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="group flex min-h-14 items-center justify-between gap-3 px-1 py-3 transition-colors duration-fast ease-out hover:bg-surface-sunken/60"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text">{label}</span>
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
    </>
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
      <p className="flex gap-2.5 px-5 py-6 text-sm text-text-muted text-pretty">
        <Hourglass aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-link" />
        Still matching this brief against every published profile. Results arrive within the hour.
      </p>
    );
  }
  if (suggested.state === 'too-sparse') {
    return (
      <p className="px-5 py-6 text-sm text-text-muted text-pretty">
        There is not enough in the brief to match on yet.{' '}
        <Link href={`/dashboard/client/jobs/${jobId}/edit`} className="prose-link font-semibold">
          Add to the description
        </Link>
        , which is also what developers read before applying.
      </p>
    );
  }
  return (
    <p className="px-5 py-6 text-sm text-text-muted text-pretty">
      Nobody strong enough to suggest yet. We&rsquo;d rather show nothing than pad this with
      developers who don&rsquo;t fit.
    </p>
  );
}

/** Avatar tile plus two lines, the shape of a CandidateMatchItem. */
function CandidatesSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading candidates" className="space-y-4 p-5">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex gap-3.5">
          <Skeleton className="size-10 shrink-0 rounded-md" />
          <div className="flex-1 space-y-2 pt-0.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Four stat tiles, then the jobs card beside the candidates card. */
function DashboardSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your dashboard">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Each tile is the rendered Stat height: 106px on a phone, 112px from sm (measured). */}
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[6.625rem] rounded-lg sm:h-28" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] xl:items-start">
        <div className="rounded-lg border border-border-base bg-surface-raised">
          <div className="border-b border-border-base px-5 py-4">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="divide-y divide-border-base">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-6 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-border-base bg-surface-raised">
          <div className="border-b border-border-base px-5 py-4">
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex gap-3.5">
                <Skeleton className="size-10 shrink-0 rounded-md" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
