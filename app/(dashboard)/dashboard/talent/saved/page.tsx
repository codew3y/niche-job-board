import { Bookmark } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveButton } from '@/components/shared/save-button';
import { formatRange } from '@/components/shared/money';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Saved jobs' };

export default async function SavedJobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: saved } = profile
    ? await supabase
        .from('saved_jobs')
        .select(
          `job_id, created_at,
           jobs ( id, slug, title, status, budget_min, budget_max, currency, engagement_type,
                  client_profiles ( company_name ) )`,
        )
        .eq('talent_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: null };

  const rows = (saved ?? []).filter((r) => r.jobs) as unknown as {
    job_id: string;
    jobs: {
      id: string;
      slug: string;
      title: string;
      status: string;
      budget_min: string | null;
      budget_max: string | null;
      currency: string;
      engagement_type: string;
      client_profiles: { company_name: string } | null;
    };
  }[];

  return (
    <div className="max-w-3xl">
      <PageHeader title="Saved jobs" subtitle="Private to you. Clients are never told." />

      {rows.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          body="Save a job while browsing and it lands here, so you can come back to it."
          action={
            <Link href="/browse?type=jobs" className={buttonStyles()}>
              Browse jobs
            </Link>
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-text-muted tabular-nums">
            {rows.length} saved {rows.length === 1 ? 'job' : 'jobs'}
          </p>
          <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
            {rows.map(({ jobs: job }) => {
              const budget = formatRange(
                job.budget_min,
                job.budget_max,
                job.currency,
                job.engagement_type === 'hourly' ? '/hr' : '',
              );
              const closed = job.status !== 'open';
              return (
                <li
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-balance">
                      <Link href={`/jobs/${job.slug}`} className="hover:underline">
                        {job.title}
                      </Link>
                    </h2>
                    <p className="mt-0.5 text-sm font-medium text-text">
                      {job.client_profiles?.company_name ?? 'A client'}
                    </p>
                    {(budget || closed) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
                        {budget && <span className="tabular-nums">{budget}</span>}
                        {closed && <Badge tone="outline">Closed</Badge>}
                      </div>
                    )}
                  </div>
                  <SaveButton kind="job" id={job.id} saved label={job.title} />
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
