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

  // RLS already restricts jobs to their owner, so a miss here means "not yours" or
  // "does not exist" — both 404, because a 403 would confirm which.
  const { data: job } = await supabase
    .from('jobs')
    .select('id, title, slug, status')
    .eq('id', id)
    .maybeSingle();
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
