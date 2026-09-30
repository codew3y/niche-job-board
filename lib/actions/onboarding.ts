'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { makeSlug } from '../onboarding/steps';
import { clientProfileInput } from '../schemas/client';
import { embedInBackground } from '../matching/ingest';
import { createClient } from '../supabase/server';
import type { ActionResult } from './auth';

/**
 * Onboarding step actions — Phase 2 §6: "progress saved per step so a refresh doesn't lose
 * work".
 *
 * Each step writes immediately. The profile and the job are created as DRAFTS and only
 * published at the review step, because the `talent_publish_gate` CHECK refuses a published
 * row without evidence and during onboarding the evidence does not exist yet.
 *
 * That ordering is not a workaround. It is the same draft-then-publish sequence the seed
 * script had to adopt when the constraint caught it taking a shortcut the real UI cannot take.
 */

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, user };
}

const trimOrNull = (v: FormDataEntryValue | null) => String(v ?? '').trim() || null;

// ─────────────────────────────── talent ───────────────────────────────

export async function saveTalentBasics(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const headline = String(formData.get('headline') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();

  const errors: Record<string, string[]> = {};
  if (headline.length < 10) errors.headline = ['Say what you do — at least 10 characters.'];
  if (bio.length < 120) {
    errors.bio = [
      'At least 120 characters. This is the text matching reads, so a thin bio gets thin matches.',
    ];
  }
  if (Object.keys(errors).length) {
    return { ok: false, message: 'Check the fields below.', fields: errors };
  }

  const { data: existing } = await supabase
    .from('talent_profiles')
    .select('slug')
    .eq('user_id', user.id)
    .maybeSingle();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  const { error } = await supabase.from('talent_profiles').upsert(
    {
      user_id: user.id,
      headline,
      bio,
      timezone: trimOrNull(formData.get('timezone')),
      years_experience: Number(formData.get('yearsExperience')) || null,
      is_published: false,
      slug: existing?.slug ?? makeSlug(profile?.display_name ?? 'member'),
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, message: 'Could not save. Try again.' };

  revalidatePath('/onboarding/talent', 'layout');
  redirect('/onboarding/talent/skills');
}

export async function saveTalentSkills(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const skillIds = formData.getAll('skillId').map(String).filter(Boolean);
  /**
   * Zero skills is allowed. This refused it, which was the last surviving piece of the publish
   * gate ADR-008 removed — and here it was worse than elsewhere, because it blocked someone
   * from finishing onboarding at all.
   *
   * The consequence is theirs and the UI states it: no skills means no skill filter finds you.
   */
  if (skillIds.length > 30) {
    return {
      ok: false,
      message: 'Pick your strongest 30 at most — a list of everything says nothing.',
    };
  }

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  // One hourly rate, stored as min = max (see updateProfile in lib/actions/profile.ts).
  const rate = String(formData.get('hourlyRate') ?? '').trim();
  if (rate && !/^\d{1,8}(\.\d{1,2})?$/.test(rate)) {
    return {
      ok: false,
      message: 'Check the fields below.',
      fields: { hourlyRate: ['Enter a number, like 85 or 85.50.'] },
    };
  }

  const { error: rateError } = await supabase
    .from('talent_profiles')
    .update({
      hourly_rate_min: rate || null,
      hourly_rate_max: rate || null,
      currency: String(formData.get('currency') ?? 'USD'),
      availability: String(formData.get('availability') ?? 'part_time'),
    })
    .eq('id', profile.id);
  if (rateError) return { ok: false, message: 'Could not save your rates.' };

  // Replace rather than merge: the form carries the full set, so a removed skill must go.
  await supabase.from('talent_skills').delete().eq('talent_id', profile.id);
  const { error } = await supabase
    .from('talent_skills')
    .insert(skillIds.map((skillId) => ({ talent_id: profile.id, skill_id: skillId })));
  if (error) return { ok: false, message: 'Could not save your skills.' };

  revalidatePath('/onboarding/talent', 'layout');
  redirect('/onboarding/talent/portfolio');
}

export async function saveTalentEvidence(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const clean = (v: FormDataEntryValue | null) => {
    const s = String(v ?? '').trim();
    return s ? s.replace(/\/+$/, '') : null;
  };
  const website = clean(formData.get('websiteUrl'));
  const github = clean(formData.get('githubUrl'));
  const linkedin = clean(formData.get('linkedinUrl'));

  const errors: Record<string, string[]> = {};
  for (const [key, value] of [
    ['websiteUrl', website],
    ['githubUrl', github],
    ['linkedinUrl', linkedin],
  ] as const) {
    // https only — the *_urls_https CHECK enforces the same rule. This copy names the field.
    if (value && !/^https:\/\//i.test(value)) errors[key] = ['Must be a full https:// link.'];
  }
  if (Object.keys(errors).length)
    return { ok: false, message: 'Check the links below.', fields: errors };

  const { error } = await supabase
    .from('talent_profiles')
    .update({ website_url: website, github_url: github, linkedin_url: linkedin })
    .eq('id', profile.id);
  if (error) return { ok: false, message: 'Could not save your links.' };

  revalidatePath('/onboarding/talent', 'layout');
  redirect('/onboarding/talent/review');
}

export async function addPortfolioItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const errors: Record<string, string[]> = {};
  if (title.length < 3) errors.title = ['Give the project a name.'];
  if (description.length < 40) {
    errors.description = ['Describe what it was and what you did — at least 40 characters.'];
  }
  if (Object.keys(errors).length)
    return { ok: false, message: 'Check the fields below.', fields: errors };

  const { error } = await supabase.from('portfolio_items').insert({
    talent_id: profile.id,
    title,
    description,
    outcome: trimOrNull(formData.get('outcome')),
    tech_stack: String(formData.get('techStack') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
    // Blank rows dropped; the database refuses anything but https (item_links_https).
    links: [
      ...new Set(
        formData
          .getAll('link')
          .map((v) => String(v).trim())
          .filter(Boolean)
          .slice(0, 10),
      ),
    ],
    sort_order: profile.portfolio_item_count,
  });
  if (error)
    return { ok: false, message: 'Could not add that project. Check any links are https.' };

  revalidatePath('/onboarding/talent/portfolio');
  return { ok: true };
}

export async function deletePortfolioItem(formData: FormData): Promise<void> {
  const { supabase } = await requireUser();
  const id = String(formData.get('id') ?? '');
  // RLS restricts the delete to the owner, so no extra filter is needed for safety.
  if (id) await supabase.from('portfolio_items').delete().eq('id', id);
  revalidatePath('/onboarding/talent/portfolio');
}

export async function publishTalent(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, bio, website_url, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  // Nothing to check. Onboarding used to refuse here unless the profile had a bio and either
  // a site link or two projects; that gate is gone (ADR-008). Whoever wants to be listed is
  // listed, and clients decide from there.
  const { error } = await supabase
    .from('talent_profiles')
    .update({ is_published: true })
    .eq('id', profile.id);
  if (error) return { ok: false, message: 'Could not publish. Try again.' };

  // Embed on publish rather than at each onboarding step: the text is only final now, and
  // embedding a half-filled profile three times spends free-tier quota to store three
  // versions of something nobody has finished writing.
  embedInBackground('talent_profile', profile.id);

  revalidatePath('/', 'layout');
  redirect('/dashboard/talent?welcome=1');
}

// ─────────────────────────────── client ───────────────────────────────

export async function saveCompany(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const parsed = clientProfileInput.safeParse({
    companyName: formData.get('companyName'),
    website: formData.get('website') || '',
    industry: formData.get('industry') || null,
    about: formData.get('about') || '',
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const { error } = await supabase.from('client_profiles').upsert(
    {
      user_id: user.id,
      company_name: parsed.data.companyName,
      website: parsed.data.website,
      industry: parsed.data.industry,
      about: parsed.data.about,
    },
    { onConflict: 'user_id' },
  );
  if (error) return { ok: false, message: 'Could not save. Try again.' };

  revalidatePath('/onboarding/client', 'layout');
  redirect('/onboarding/client/job');
}

export async function saveFirstJob(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) redirect('/onboarding/client/company');

  const skillIds = formData.getAll('skillId').map(String).filter(Boolean);
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const locationType = String(formData.get('locationType') ?? 'remote');
  const location = String(formData.get('location') ?? '').trim();
  const min = String(formData.get('budgetMin') ?? '').trim();
  const max = String(formData.get('budgetMax') ?? '').trim();

  const errors: Record<string, string[]> = {};
  if (title.length < 10) errors.title = ['Give the role a descriptive title.'];
  if (description.length < 120)
    errors.description = ['At least 120 characters — short briefs get poor matches.'];
  if (skillIds.length === 0)
    errors.skills = ['Add at least one skill, or nobody can be matched to this.'];
  if (locationType !== 'remote' && !location) {
    errors.location = ['Hybrid and onsite roles need a location, or nobody can filter for them.'];
  }
  if (min && max && Number(min) > Number(max)) {
    errors.budgetMax = ['Maximum budget must be at least the minimum.'];
  }
  if (Object.keys(errors).length)
    return { ok: false, message: 'Check the fields below.', fields: errors };

  const { data: existing } = await supabase
    .from('jobs')
    .select('id')
    .eq('client_id', client.id)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const shared = {
    client_id: client.id,
    title,
    description,
    requirements: trimOrNull(formData.get('requirements')),
    engagement_type: String(formData.get('engagementType') ?? 'fixed'),
    budget_min: min || null,
    budget_max: max || null,
    currency: String(formData.get('currency') ?? 'USD'),
    location_type: locationType,
    location: locationType === 'remote' ? null : location,
    status: 'draft' as const,
  };

  let jobId = existing?.id;
  if (jobId) {
    const { error } = await supabase.from('jobs').update(shared).eq('id', jobId);
    if (error) return { ok: false, message: 'Could not save the brief.' };
  } else {
    const { data: created, error } = await supabase
      .from('jobs')
      .insert({ ...shared, slug: makeSlug(title) })
      .select('id')
      .single();
    if (error || !created) return { ok: false, message: 'Could not save the brief.' };
    jobId = created.id;
  }

  // Replace the skill set wholesale, same reasoning as talent_skills.
  await supabase.from('job_skills').delete().eq('job_id', jobId);
  await supabase
    .from('job_skills')
    .insert(
      skillIds.map((skillId, i) => ({ job_id: jobId, skill_id: skillId, is_required: i < 3 })),
    );

  revalidatePath('/onboarding/client', 'layout');
  redirect('/onboarding/client/review');
}

export async function publishFirstJob(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) redirect('/onboarding/client/company');

  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('client_id', client.id)
    .eq('status', 'draft')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!job) redirect('/onboarding/client/job');

  const { error } = await supabase
    .from('jobs')
    .update({ status: 'open', published_at: new Date().toISOString() })
    .eq('id', job.id);
  if (error) return { ok: false, message: 'Could not publish the brief.' };

  revalidatePath('/', 'layout');
  redirect('/dashboard/client?welcome=1');
}
