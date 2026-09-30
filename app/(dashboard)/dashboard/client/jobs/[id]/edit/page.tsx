import { ArrowLeft } from 'lucide-react';
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

  /**
   * Same explicit ownership check as the applications page, and for the same reason: RLS does
   * NOT scope jobs to their owner. `jobs_select_open_or_own` allows any authenticated user to
   * read any non-draft job, so this page's `if (!job) notFound()` never fired for an open one
   * and the edit form loaded for a stranger. Writes would still have been refused by the
   * update policy, but a form that renders and then fails on submit is not a boundary.
   */
  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) notFound();

  const { data: job } = await supabase
    .from('jobs')
    .select(
      `id, title, description, requirements, engagement_type, budget_min, budget_max,
       currency, location_type, location, experience_level, deadline, status, slug`,
    )
    .eq('id', id)
    .eq('client_id', client.id)
    .maybeSingle();
  if (!job) notFound();

  const [{ data: skills }, { data: jobSkills }] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    supabase.from('job_skills').select('skill_id').eq('job_id', job.id),
  ]);

  return (
    <div className="max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm">
        <Link
          href="/dashboard/client/jobs"
          className="inline-flex items-center gap-1 text-text-muted hover:text-text"
        >
          <ArrowLeft aria-hidden="true" size={15} /> All jobs
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
              <Link href={`/jobs/${job.slug}`} className="prose-link font-semibold">
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
