'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '../supabase/server';

/**
 * Bookmarking, both directions.
 *
 * Saved lists are strictly private — RLS gives no read path to the other party, so a talent
 * can never learn which clients bookmarked them. That is deliberate: a visible "3 clients
 * saved you" would be a signal people optimise for, and an invisible one they cannot.
 *
 * Both actions toggle rather than having separate add/remove endpoints, so a double-click
 * lands back where it started instead of erroring on a duplicate key.
 */

export async function toggleSavedJob(formData: FormData): Promise<void> {
  const jobId = String(formData.get('jobId') ?? '');
  if (!jobId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/jobs')}`);

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const { data: existing } = await supabase
    .from('saved_jobs')
    .select('job_id')
    .eq('talent_id', profile.id)
    .eq('job_id', jobId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_jobs').delete().eq('talent_id', profile.id).eq('job_id', jobId);
  } else {
    await supabase.from('saved_jobs').insert({ talent_id: profile.id, job_id: jobId });
  }

  revalidatePath('/dashboard/talent/saved');
  revalidatePath(`/jobs`);
}

export async function toggleSavedTalent(formData: FormData): Promise<void> {
  const talentId = String(formData.get('talentId') ?? '');
  if (!talentId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/talent')}`);

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) redirect('/onboarding/client/company');

  const { data: existing } = await supabase
    .from('saved_talent')
    .select('talent_id')
    .eq('client_id', client.id)
    .eq('talent_id', talentId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('saved_talent')
      .delete()
      .eq('client_id', client.id)
      .eq('talent_id', talentId);
  } else {
    await supabase.from('saved_talent').insert({ client_id: client.id, talent_id: talentId });
  }

  revalidatePath('/dashboard/client/saved');
  revalidatePath('/talent');
}
