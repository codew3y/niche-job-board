import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Jobs' };

export default async function ClientJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('client_profiles').select('id').eq('user_id', user.id).maybeSingle();

  const { data: jobs } = client
    ? await supabase
        .from('jobs')
        .select('id, title, status, created_at')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    : { data: null };

  return (
    <div>
      <PageHeader title="Jobs" subtitle="Every brief you've written, published or not." />
      {jobs?.length ? (
        <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center justify-between gap-4 p-4">
              <span className="font-medium">{job.title}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs ${
                  job.status === 'open' ? 'bg-success/15 text-success' : 'bg-surface-sunken text-text-subtle'
                }`}
              >
                {job.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No briefs yet"
          body="Post one and we'll rank candidates against the work they've actually shipped."
          action={<Link href="/onboarding/client/job" className="text-accent hover:underline">Write a brief</Link>}
        />
      )}
    </div>
  );
}
