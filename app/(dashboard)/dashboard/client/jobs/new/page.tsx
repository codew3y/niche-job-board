import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { JobForm } from '@/components/job/job-form';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Post a job' };

export default async function NewJobPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) redirect('/onboarding/client/company');

  const { data: skills } = await supabase
    .from('skills')
    .select('id, name, category, aliases')
    .order('name');

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="New brief"
        title="Post a job"
        subtitle="Save it as a draft and come back, or publish now."
      />
      <JobForm job={null} options={skills ?? []} initialSkills={[]} isPublished={false} />
    </div>
  );
}
