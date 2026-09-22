'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { publishTalentProfile } from '../schemas/talent';
import { createClient } from '../supabase/server';
import type { ActionResult } from './auth';

/**
 * Profile and portfolio editing outside onboarding.
 *
 * Onboarding is a one-way wizard; this is the place people return to. The difference that
 * matters: here a profile can already be PUBLISHED, so an edit that removes evidence has to
 * be handled rather than assumed away.
 */

async function requireTalent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, is_published, bio, website_url, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  return { supabase, profile };
}

const trimOrNull = (v: FormDataEntryValue | null) => String(v ?? '').trim() || null;
const cleanUrl = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s ? s.replace(/\/+$/, '') : null;
};

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();

  const headline = String(formData.get('headline') ?? '').trim();
  const bio = String(formData.get('bio') ?? '').trim();
  const website = cleanUrl(formData.get('websiteUrl'));
  const github = cleanUrl(formData.get('githubUrl'));
  const linkedin = cleanUrl(formData.get('linkedinUrl'));

  const errors: Record<string, string[]> = {};
  if (headline.length < 10) errors.headline = ['Say what you do — at least 10 characters.'];
  if (bio.length < 120) errors.bio = ['At least 120 characters — this is what matching reads.'];
  for (const [key, value] of [
    ['websiteUrl', website],
    ['githubUrl', github],
    ['linkedinUrl', linkedin],
  ] as const) {
    if (value && !/^https:\/\//i.test(value)) errors[key] = ['Must be a full https:// link.'];
  }

  const min = String(formData.get('hourlyRateMin') ?? '').trim();
  const max = String(formData.get('hourlyRateMax') ?? '').trim();
  if (min && max && Number(min) > Number(max)) {
    errors.hourlyRateMax = ['Maximum rate must be at least the minimum.'];
  }

  /**
   * A published profile cannot edit its way below the publish gate.
   *
   * The CHECK constraint would reject the update anyway, but with a constraint-violation
   * message nobody can act on. Catching it here lets the message name the consequence and
   * offer the alternative: unpublish first.
   */
  if (profile.is_published) {
    const gate = publishTalentProfile.safeParse({
      bio,
      websiteUrl: website,
      portfolioItemCount: profile.portfolio_item_count,
    });
    if (!gate.success) {
      errors._ = [
        'That would leave your published profile without enough evidence. Add a project or keep the site link — or unpublish first.',
      ];
    }
  }

  if (Object.keys(errors).length) {
    return { ok: false, message: errors._?.[0] ?? 'Check the fields below.', fields: errors };
  }

  const { error } = await supabase
    .from('talent_profiles')
    .update({
      headline,
      bio,
      website_url: website,
      github_url: github,
      linkedin_url: linkedin,
      hourly_rate_min: min || null,
      hourly_rate_max: max || null,
      currency: String(formData.get('currency') ?? 'USD'),
      availability: String(formData.get('availability') ?? 'part_time'),
      years_experience: Number(formData.get('yearsExperience')) || null,
      timezone: trimOrNull(formData.get('timezone')),
    })
    .eq('id', profile.id);

  if (error) return { ok: false, message: 'Could not save. Try again.' };

  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/talent');
  return { ok: true };
}

export async function updateSkills(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const skillIds = formData.getAll('skillId').map(String).filter(Boolean);

  if (skillIds.length === 0) return { ok: false, message: 'Pick at least one skill.' };
  if (skillIds.length > 30) return { ok: false, message: 'Thirty at most.' };

  await supabase.from('talent_skills').delete().eq('talent_id', profile.id);
  const { error } = await supabase
    .from('talent_skills')
    .insert(skillIds.map((skillId) => ({ talent_id: profile.id, skill_id: skillId })));
  if (error) return { ok: false, message: 'Could not save your skills.' };

  revalidatePath('/dashboard/talent/profile');
  return { ok: true };
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const wantPublished = formData.get('publish') === 'true';

  if (wantPublished) {
    const gate = publishTalentProfile.safeParse({
      bio: profile.bio ?? '',
      websiteUrl: profile.website_url,
      portfolioItemCount: profile.portfolio_item_count,
    });
    if (!gate.success) return; // the UI does not offer the button in this state
  }

  await supabase
    .from('talent_profiles')
    .update({ is_published: wantPublished })
    .eq('id', profile.id);
  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/talent');
}

// ─────────────────────────── portfolio items ───────────────────────────

export async function saveItem(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const itemId = String(formData.get('itemId') ?? '') || null;

  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim();
  const errors: Record<string, string[]> = {};
  if (title.length < 3) errors.title = ['Give the project a name.'];
  if (description.length < 40) errors.description = ['At least 40 characters.'];
  for (const key of ['repoUrl', 'liveUrl'] as const) {
    const v = cleanUrl(formData.get(key));
    if (v && !/^https:\/\//i.test(v)) errors[key] = ['Must be a full https:// link.'];
  }
  if (Object.keys(errors).length) {
    return { ok: false, message: 'Check the fields below.', fields: errors };
  }

  const payload = {
    title,
    description,
    role: trimOrNull(formData.get('role')),
    outcome: trimOrNull(formData.get('outcome')),
    tech_stack: String(formData.get('techStack') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 20),
    repo_url: cleanUrl(formData.get('repoUrl')),
    live_url: cleanUrl(formData.get('liveUrl')),
  };

  const { error } = itemId
    ? await supabase
        .from('portfolio_items')
        .update(payload)
        .eq('id', itemId)
        .eq('talent_id', profile.id)
    : await supabase.from('portfolio_items').insert({
        ...payload,
        talent_id: profile.id,
        sort_order: profile.portfolio_item_count,
      });

  if (error) return { ok: false, message: 'Could not save that project.' };

  revalidatePath('/dashboard/talent/portfolio');
  revalidatePath('/talent');
  return { ok: true };
}

export async function deleteItem(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('itemId') ?? '');
  if (!id) return;

  /**
   * Deleting the evidence a published profile depends on would violate the publish gate
   * CHECK, so the profile is unpublished first rather than letting the delete fail with a
   * constraint error the user cannot interpret.
   */
  const wouldBreakGate =
    profile.is_published && !profile.website_url && profile.portfolio_item_count <= 2;
  if (wouldBreakGate) {
    await supabase.from('talent_profiles').update({ is_published: false }).eq('id', profile.id);
  }

  await supabase.from('portfolio_items').delete().eq('id', id).eq('talent_id', profile.id);
  revalidatePath('/dashboard/talent/portfolio');
  revalidatePath('/talent');
}

/**
 * Reorder by rewriting sort_order for the ids given.
 *
 * The client sends the whole order, not a move instruction — a move is only meaningful
 * against a list the server also has, and the two can disagree if a second tab is open.
 */
export async function reorderItems(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const ids = formData.getAll('itemId').map(String).filter(Boolean);
  if (!ids.length) return;

  await Promise.all(
    ids.map((id, index) =>
      supabase
        .from('portfolio_items')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('talent_id', profile.id),
    ),
  );
  revalidatePath('/dashboard/talent/portfolio');
  revalidatePath('/talent');
}
