import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CandidateList } from '@/components/application/candidate-list';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Applications' };

export default async function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /**
   * Ownership is checked HERE, explicitly. It is not implied by RLS.
   *
   * `jobs_select_open_or_own` reads `status <> 'draft' OR owner` — which is correct for a
   * public job board and means ANY authenticated user can select ANY open job by id. This
   * file used to carry a comment claiming RLS restricted jobs to their owner and rely on a
   * `if (!job) notFound()` that therefore never fired for an open job. A developer who had
   * applied could open the client-side management page for that job.
   *
   * Found by e2e/flows.spec.ts. Scoping the query to the viewer's own client profile is what
   * makes the 404 real.
   */
  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) notFound();

  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, slug, status')
    .eq('id', id)
    .eq('client_id', client.id)
    .maybeSingle();
  // 404 rather than 403: a 403 confirms the job exists, which is itself a disclosure.
  if (!job) notFound();

  const { data: applications } = await supabase
    .from('applications')
    .select(
      `id, status, cover_note, created_at, match_reason,
       talent_profiles ( slug, headline, portfolio_item_count, website_url )`,
    )
    .eq('job_id', job.id)
    .order('created_at', { ascending: false });

  const rows = (applications ?? []) as unknown as Parameters<typeof CandidateList>[0]['candidates'];
  const active = rows.filter((r) => r.status !== 'withdrawn');
  const withdrawn = rows.filter((r) => r.status === 'withdrawn');

  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/dashboard/client/jobs" className="text-text-muted hover:text-text">
          ← All jobs
        </Link>
      </nav>

      <PageHeader
        title={job.title}
        subtitle={
          <>
            {active.length} {active.length === 1 ? 'application' : 'applications'}
            {' · '}
            <Link href={`/jobs/${job.slug}`} className="text-accent hover:underline">
              View the public page
            </Link>
          </>
        }
      />

      {active.length > 0 ? (
        <CandidateList candidates={active} />
      ) : (
        <EmptyState
          title="No applications yet"
          body="They'll appear here as they arrive, newest first, with the evidence behind each one."
        />
      )}

      {withdrawn.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-text-muted">
            {withdrawn.length} withdrawn
          </summary>
          <div className="mt-3">
            <CandidateList candidates={withdrawn} />
          </div>
        </details>
      )}
    </div>
  );
}
