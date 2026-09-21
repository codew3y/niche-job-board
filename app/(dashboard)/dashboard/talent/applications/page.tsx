import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Applications' };

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

  const { data: applications } = profile
    ? await supabase
        .from('applications')
        .select('id, status, created_at, jobs(title)')
        .eq('talent_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: null };

  return (
    <div>
      <PageHeader title="Applications" subtitle="Where each one stands." />
      {applications?.length ? (
        <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
          {applications.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 p-4">
              <span className="font-medium">
                {(a.jobs as { title?: string } | null)?.title ?? 'A job'}
              </span>
              <span className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs text-text-subtle">
                {a.status}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No applications yet"
          body="Applications you send appear here, and you'll see every status change as it happens."
        />
      )}
    </div>
  );
}
