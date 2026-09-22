import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { JobForm } from '@/components/job/job-form';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Edit job' };

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // RLS scopes jobs to their owner, so a miss is "not yours" or "gone" — both 404.
  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, title, description, requirements, engagement_type, budget_min, budget_max,
       currency, location_type, location, experience_level, deadline, status, slug`,
    )
    .eq('id', id)
    .maybeSingle();
  if (!job) notFound();

  const [{ data: skills }, { data: jobSkills }] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    supabase.from('job_skills').select('skill_id').eq('job_id', job.id),
  ]);

  return (
    <div className="max-w-2xl">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/dashboard/client/jobs" className="text-text-muted hover:text-text">
          ← All jobs
        </Link>
      </nav>
      <PageHeader
        title="Edit job"
        subtitle={
          job.status === 'draft' ? (
            'Still a draft — nobody can see it yet.'
          ) : (
            <>
              Live at{' '}
              <Link href={`/jobs/${job.slug}`} className="text-accent hover:underline">
                /jobs/{job.slug}
              </Link>
            </>
          )
        }
      />
      <JobForm
        job={job}
        options={skills ?? []}
        initialSkills={(jobSkills ?? []).map((s) => s.skill_id)}
        isPublished={job.status !== 'draft'}
      />
    </div>
  );
}
