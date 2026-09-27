import Link from 'next/link';
import type { Metadata } from 'next';

import { EmptyState } from '@/components/ui/empty-state';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Dashboard' };

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-text-muted">
          {client?.company_name ?? 'Finish setting up your company profile.'}
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Your jobs</h2>
        {jobs?.length ? (
          <ul className="divide-y divide-border-base rounded-md border border-border-base">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-4 p-4">
                <span className="font-medium">{job.title}</span>
                <span className="text-sm text-text-subtle">{job.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No jobs posted yet"
            body="Post a brief and we’ll rank candidates against the work they’ve actually shipped."
            action={
              <Link href="/client/jobs/new" className="prose-link font-medium">
                Post a job
              </Link>
            }
          />
        )}
      </section>

      {/* Matches and Saved left the top navigation when it was restructured around
          intentions rather than features. They are linked here instead, which is where
          someone goes looking for them. */}
      <nav aria-label="Quick links" className="mt-10 border-t border-border-base pt-6">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <li>
            <Link href="/dashboard/client/saved" className="prose-link font-medium">
              Saved developers
            </Link>
          </li>
          <li>
            <Link href="/dashboard/client/jobs/new" className="prose-link font-medium">
              Post a job
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
