'use server';

import { revalidatePath } from 'next/cache';

import { requireAdmin } from '../admin';
import { invalidate } from '../matching/cache';
import { createServiceClient } from '../supabase/server';

/**
 * Report handling for admins (ADMIN_EMAILS). The service role, because an admin acts on other
 * people's rows; every action re-checks requireAdmin() first, so the role is never reachable by
 * anyone else, whatever they post.
 *
 * Deliberately small: resolve a report, close a reported job, unpublish a reported profile.
 * Nothing is deleted. Closing and unpublishing are reversible by their owners (reopen, publish),
 * which keeps a mistaken report from destroying someone's work.
 */

const UUID = /^[0-9a-f-]{36}$/i;

async function resolve(reportId: string) {
  await createServiceClient()
    .from('reports')
    .update({ resolved_at: new Date().toISOString() })
    .eq('id', reportId)
    .is('resolved_at', null);
}

export async function resolveReport(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('reportId') ?? '');
  if (!UUID.test(id)) return;
  await resolve(id);
  revalidatePath('/dashboard/admin');
}

export async function closeReportedJob(formData: FormData): Promise<void> {
  await requireAdmin();
  const reportId = String(formData.get('reportId') ?? '');
  const jobId = String(formData.get('jobId') ?? '');
  if (!UUID.test(reportId) || !UUID.test(jobId)) return;
  await createServiceClient()
    .from('jobs')
    .update({ status: 'closed' })
    .eq('id', jobId)
    .eq('status', 'open');
  void invalidate('job', jobId);
  await resolve(reportId);
  revalidatePath('/dashboard/admin');
  revalidatePath('/browse');
}

export async function unpublishReportedProfile(formData: FormData): Promise<void> {
  await requireAdmin();
  const reportId = String(formData.get('reportId') ?? '');
  const talentId = String(formData.get('talentId') ?? '');
  if (!UUID.test(reportId) || !UUID.test(talentId)) return;
  await createServiceClient()
    .from('talent_profiles')
    .update({ is_published: false })
    .eq('id', talentId);
  void invalidate('talent', talentId);
  await resolve(reportId);
  revalidatePath('/dashboard/admin');
  revalidatePath('/browse');
}
