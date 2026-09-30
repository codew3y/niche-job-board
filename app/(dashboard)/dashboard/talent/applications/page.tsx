import { Send } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { StatusBadge } from '@/components/application/status-badge';
import { StatusTimeline } from '@/components/application/status-timeline';
import { ActionForm } from '@/components/ui/action-form';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { formatRange } from '@/components/shared/money';
import { withdrawApplication } from '@/lib/actions/applications';
import { allowedStatusTransitions } from '@/lib/schemas/enums';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Applications' };

type Row = {
  id: string;
  status: string;
  cover_note: string;
  created_at: string;
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
  } | null;
};

export default async function ApplicationsPage() {
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

  const { data } = profile
    ? await supabase
        .from('applications')
        .select(
          `id, status, cover_note, created_at,
           jobs ( id, slug, title, status, budget_min, budget_max, currency, engagement_type,
                  client_profiles ( company_name ) )`,
        )
        .eq('talent_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: null };

  const rows = (data ?? []) as unknown as Row[];

  // One query for every timeline rather than one per row — the N+1 the plan says to keep
  // out of the codebase rather than audit back out in Phase 5.
  const { data: events } = rows.length
    ? await supabase
        .from('application_events')
        .select('application_id, from_status, to_status, at')
        .in(
          'application_id',
          rows.map((r) => r.id),
        )
        .order('at')
    : { data: [] };

  const byApplication = new Map<
    string,
    { from_status: string | null; to_status: string; at: string }[]
  >();
  for (const e of events ?? []) {
    const list = byApplication.get(e.application_id) ?? [];
    list.push(e);
    byApplication.set(e.application_id, list);
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-3xl">
        <PageHeader title="Applications" subtitle="Where each one stands." />
        <EmptyState
          icon={Send}
          title="No applications yet"
          body="Applications you send appear here, with every status change as it happens."
          action={
            <Link href="/browse?type=jobs" className={buttonStyles({ size: 'sm' })}>
              Browse jobs
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Applications"
        subtitle={`${rows.length} ${rows.length === 1 ? 'application' : 'applications'} — every status change, as it happens.`}
      />

      <ul className="space-y-3">
        {rows.map((row) => {
          const job = row.jobs;
          const budget = job
            ? formatRange(
                job.budget_min,
                job.budget_max,
                job.currency,
                job.engagement_type === 'hourly' ? '/hr' : '',
              )
            : null;
          const canWithdraw = (
            allowedStatusTransitions.talent[
              row.status as keyof typeof allowedStatusTransitions.talent
            ] as readonly string[]
          ).includes('withdrawn');

          return (
            <li key={row.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-balance">
                      {job ? (
                        <Link href={`/jobs/${job.slug}`} className="hover:underline">
                          {job.title}
                        </Link>
                      ) : (
                        'This job was removed'
                      )}
                    </h2>
                    <p className="mt-0.5 text-sm text-text-subtle">
                      {job?.client_profiles?.company_name ?? 'A client'}
                      {budget ? <span className="tabular-nums"> · {budget}</span> : ''}
                      {job && job.status !== 'open' ? ' · job closed' : ''}
                    </p>
                  </div>
                  <StatusBadge status={row.status} />
                </div>

                <StatusTimeline events={byApplication.get(row.id) ?? []} />

                {canWithdraw && (
                  // Only offered while the outcome is still open — the transition table says a
                  // rejected or hired application cannot be withdrawn.
                  <ActionForm
                    action={withdrawApplication}
                    success="Application withdrawn"
                    className="mt-4 border-t border-border-base pt-3"
                  >
                    <input type="hidden" name="applicationId" value={row.id} />
                    <SubmitButton variant="ghost" size="sm" pendingLabel="Withdrawing…">
                      Withdraw
                    </SubmitButton>
                  </ActionForm>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
