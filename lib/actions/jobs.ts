'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { makeSlug } from '../onboarding/steps';
import { createClient } from '../supabase/server';
import type { ActionResult } from './auth';

/**
 * Job lifecycle outside onboarding: create, edit, publish, close, reopen, duplicate.
 *
 * Every one re-checks ownership through the client profile rather than trusting the job id
 * from the form. RLS enforces it too, but a handler that relies solely on RLS produces a
 * silent no-op instead of a message when it is wrong.
 */

async function requireClient() {
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

  return { supabase, client };
}

type JobFields = {
  title: string;
  description: string;
  requirements: string | null;
  engagement_type: string;
  budget_min: string | null;
  budget_max: string | null;
  currency: string;
  location_type: string;
  location: string | null;
  experience_level: string | null;
  deadline: string | null;
};

function readJobFields(formData: FormData): {
  fields: JobFields;
  errors: Record<string, string[]>;
} {
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const locationType = String(formData.get('locationType') ?? 'remote');
  const location = String(formData.get('location') ?? '').trim();
  const min = String(formData.get('budgetMin') ?? '').trim();
  const max = String(formData.get('budgetMax') ?? '').trim();
  const deadline = String(formData.get('deadline') ?? '').trim();

  const errors: Record<string, string[]> = {};
  if (title.length < 10) errors.title = ['Give the role a descriptive title.'];
  if (description.length < 120) {
    errors.description = ['At least 120 characters — short briefs get poorly matched candidates.'];
  }
  if (locationType !== 'remote' && !location) {
    errors.location = ['Hybrid and onsite roles need a location, or nobody can filter for them.'];
  }
  if (min && max && Number(min) > Number(max)) {
    errors.budgetMax = ['Maximum budget must be at least the minimum.'];
  }

  return {
    fields: {
      title,
      description,
      requirements: String(formData.get('requirements') ?? '').trim() || null,
      engagement_type: String(formData.get('engagementType') ?? 'fixed'),
      budget_min: min || null,
      budget_max: max || null,
      currency: String(formData.get('currency') ?? 'USD'),
      location_type: locationType,
      location: locationType === 'remote' ? null : location,
      experience_level: String(formData.get('experienceLevel') ?? '').trim() || null,
      deadline: deadline || null,
    },
    errors,
  };
}

/** Skill rows are replaced wholesale — the form carries the full set, so a removal must stick. */
async function syncSkills(
  supabase: Awaited<ReturnType<typeof createClient>>,
  jobId: string,
  skillIds: string[],
) {
  await supabase.from('job_skills').delete().eq('job_id', jobId);
  if (skillIds.length) {
    await supabase
      .from('job_skills')
      .insert(
        skillIds.map((skillId, i) => ({ job_id: jobId, skill_id: skillId, is_required: i < 3 })),
      );
  }
}

export async function saveJob(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, client } = await requireClient();
  const jobId = String(formData.get('jobId') ?? '') || null;
  const publish = formData.get('intent') === 'publish';

  const { fields, errors } = readJobFields(formData);
  const skillIds = formData.getAll('skillId').map(String).filter(Boolean);
  if (skillIds.length === 0) errors.skills = ['Add at least one skill, or nobody can be matched.'];

  // The deadline rule applies on PUBLISH only. A draft written on Friday with a Monday
  // deadline must still be editable on Tuesday.
  if (publish && fields.deadline && new Date(fields.deadline) <= new Date()) {
    errors.deadline = ['The deadline has already passed.'];
  }
  if (Object.keys(errors).length) {
    return { ok: false, message: 'Check the fields below.', fields: errors };
  }

  if (jobId) {
    const { error } = await supabase
      .from('jobs')
      .update({
        ...fields,
        ...(publish ? { status: 'open', published_at: new Date().toISOString() } : {}),
      })
      .eq('id', jobId)
      .eq('client_id', client.id);
    if (error) return { ok: false, message: 'Could not save this job.' };
    await syncSkills(supabase, jobId, skillIds);
  } else {
    const { data: created, error } = await supabase
      .from('jobs')
      .insert({
        ...fields,
        client_id: client.id,
        slug: makeSlug(fields.title),
        status: publish ? 'open' : 'draft',
        published_at: publish ? new Date().toISOString() : null,
      })
      .select('id')
      .single();
    if (error || !created) return { ok: false, message: 'Could not create this job.' };
    await syncSkills(supabase, created.id, skillIds);
  }

  revalidatePath('/dashboard/client/jobs');
  revalidatePath('/jobs');
  redirect('/dashboard/client/jobs');
}

/**
 * Closing, not deleting.
 *
 * Applications reference the job, and a closed job keeps every applicant's record of it
 * intact (flows §7). Deleting would cascade them away — taking the other party's history
 * with it, which is the same principle as tombstoning a message rather than erasing it.
 */
export async function closeJob(formData: FormData): Promise<void> {
  const { supabase, client } = await requireClient();
  const id = String(formData.get('jobId') ?? '');
  if (!id) return;

  await supabase.from('jobs').update({ status: 'closed' }).eq('id', id).eq('client_id', client.id);
  revalidatePath('/dashboard/client/jobs');
  revalidatePath('/jobs');
}

export async function reopenJob(formData: FormData): Promise<void> {
  const { supabase, client } = await requireClient();
  const id = String(formData.get('jobId') ?? '');
  if (!id) return;

  await supabase
    .from('jobs')
    .update({ status: 'open', published_at: new Date().toISOString() })
    .eq('id', id)
    .eq('client_id', client.id)
    .eq('status', 'closed'); // only a closed job reopens; a filled one stays filled
  revalidatePath('/dashboard/client/jobs');
  revalidatePath('/jobs');
}

/**
 * Duplicate into a DRAFT, never straight to open.
 *
 * Copying a brief is usually the start of editing it, and a duplicate published instantly
 * would put a near-identical listing in front of everyone before the client fixed the title.
 */
export async function duplicateJob(formData: FormData): Promise<void> {
  const { supabase, client } = await requireClient();
  const id = String(formData.get('jobId') ?? '');
  if (!id) return;

  const { data: source } = await supabase
    .from('jobs')
    .select(
      `title, description, requirements, engagement_type, budget_min, budget_max, currency,
       location_type, location, experience_level`,
    )
    .eq('id', id)
    .eq('client_id', client.id)
    .maybeSingle();
  if (!source) return;

  const title = `${source.title} (copy)`;
  const { data: copy } = await supabase
    .from('jobs')
    .insert({ ...source, title, client_id: client.id, slug: makeSlug(title), status: 'draft' })
    .select('id')
    .single();
  if (!copy) return;

  const { data: skills } = await supabase
    .from('job_skills')
    .select('skill_id, is_required')
    .eq('job_id', id);
  if (skills?.length) {
    await supabase
      .from('job_skills')
      .insert(
        skills.map((s) => ({ job_id: copy.id, skill_id: s.skill_id, is_required: s.is_required })),
      );
  }

  revalidatePath('/dashboard/client/jobs');
  redirect(`/dashboard/client/jobs/${copy.id}/edit`);
}
