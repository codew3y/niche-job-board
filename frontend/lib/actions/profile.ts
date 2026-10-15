'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { embedInBackground } from '@techselect/backend/matching/ingest';
import { invalidate } from '@techselect/backend/matching/cache';
import { CURRENCY_CODES } from '@techselect/backend/currencies';
import {
  LINKEDIN_PROFILE_URL,
  certificationInput,
  educationInput,
  experienceInput,
  itemMediaInput,
} from '@techselect/backend/schemas/talent';
import { TIME_ZONE_SET } from '@techselect/backend/timezones';
import { createClient } from '@techselect/backend/supabase/server';
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
    .select('id, is_published, bio, website_url, portfolio_item_count, linkedin_connected_at')
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
  // GitHub is never typed: it comes from the connected account (migration 0021). LinkedIn is
  // typed, but only once connected; the field is not even rendered before then.
  const linkedin = cleanUrl(formData.get('linkedinUrl'));
  const linkedinConnected = Boolean(profile.linkedin_connected_at);

  const errors: Record<string, string[]> = {};
  if (headline.length < 10) errors.headline = ['Say what you do — at least 10 characters.'];
  // No minimum on the bio (owner's decision). A short bio still ranks lower, which the profile
  // page explains as a suggestion; it never blocks a save.
  if (bio.length > 4000) errors.bio = ['Keep it under 4,000 characters.'];
  for (const [key, value] of [['websiteUrl', website]] as const) {
    if (value && !/^https:\/\//i.test(value)) errors[key] = ['Must be a full https:// link.'];
  }
  if (linkedinConnected && linkedin && !LINKEDIN_PROFILE_URL.test(linkedin)) {
    errors.linkedinUrl = [
      'Paste your LinkedIn profile link, like https://www.linkedin.com/in/your-name.',
    ];
  }

  /**
   * One hourly rate, stored as min = max. The columns stay a range so browse filtering and
   * matching are untouched, and formatRange() already shows an equal pair as a single number.
   */
  const rate = String(formData.get('hourlyRate') ?? '').trim();
  if (rate && !/^\d{1,8}(\.\d{1,2})?$/.test(rate)) {
    errors.hourlyRate = ['Enter a number, like 85 or 85.50.'];
  }

  /**
   * A published profile can now be edited down to nothing without being stopped. There used
   * to be a check here mirroring talent_publish_gate, refusing an edit that would leave a
   * live profile without evidence; both it and the constraint are gone.
   *
   * Removing someone's own text from their own profile is their business.
   */

  // Validated against the same lists the pickers offer, so a crafted post cannot store a
  // currency or zone the UI could never have produced.
  const currency = String(formData.get('currency') ?? 'USD');
  if (!CURRENCY_CODES.has(currency)) errors.currency = ['Pick a currency from the list.'];
  const timezone = trimOrNull(formData.get('timezone'));
  if (timezone && !TIME_ZONE_SET.has(timezone))
    errors.timezone = ['Pick a time zone from the list.'];

  if (Object.keys(errors).length) {
    return { ok: false, message: errors._?.[0] ?? 'Check the fields below.', fields: errors };
  }

  const { error } = await supabase
    .from('talent_profiles')
    .update({
      headline,
      bio,
      website_url: website,
      ...(linkedinConnected ? { linkedin_url: linkedin } : {}),
      hourly_rate_min: rate || null,
      hourly_rate_max: rate || null,
      currency,
      availability: String(formData.get('availability') ?? 'part_time'),
      years_experience: Number(formData.get('yearsExperience')) || null,
      timezone,
    })
    .eq('id', profile.id);

  if (error) return { ok: false, message: 'Could not save. Try again.' };

  /**
   * The embedded text just changed, so the stored vector and every ranking built from it are
   * stale. Re-embed, and drop the cached rankings in BOTH directions — this profile's own
   * feed, and every job ranking that listed them.
   *
   * Neither can fail the save. The profile is the user's work; the vector is our convenience,
   * and backend/src/matching/ingest.ts holds that line.
   */
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);

  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/browse');
  return { ok: true };
}

export async function updateSkills(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const skillIds = formData.getAll('skillId').map(String).filter(Boolean);

  /**
   * Zero skills is allowed. This refused it until now, which was a leftover from the publish
   * gate the no-publish-gate decision removed — and it meant someone could not clear their skill list once set.
   * The consequence is theirs: no skills means no skill filter will find them.
   */
  if (skillIds.length > 30) return { ok: false, message: 'Thirty at most.' };

  await supabase.from('talent_skills').delete().eq('talent_id', profile.id);
  if (skillIds.length > 0) {
    const { error } = await supabase
      .from('talent_skills')
      .insert(skillIds.map((skillId) => ({ talent_id: profile.id, skill_id: skillId })));
    if (error) return { ok: false, message: 'Could not save your skills.' };
  }

  // Skills are part of the embedded text — talentToText lists them with proficiency and years.
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);

  revalidatePath('/dashboard/talent/profile');
  return { ok: true };
}

export async function togglePublish(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const wantPublished = formData.get('publish') === 'true';

  // No gate. Publishing is unconditional — the button is always live, and a sparse
  // profile goes public and competes on its merits.
  await supabase
    .from('talent_profiles')
    .update({ is_published: wantPublished })
    .eq('id', profile.id);

  /**
   * Unpublishing must drop the cached rankings that list this profile, or they keep appearing
   * in clients' candidate lists — the service filters unpublished profiles out on read, but
   * the ranking slot is still spent on someone invisible.
   */
  void invalidate('talent', profile.id);
  if (wantPublished) embedInBackground('talent_profile', profile.id);

  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/browse');
}

/**
 * Turn new messages from clients on or off (`accepts_messages`; the terms promise it).
 *
 * Off means no client can START a conversation with this developer: conversations_insert_client
 * checks the flag, so this is enforced by the database, not just by hiding the button.
 * Conversations already open continue; blocking is the tool for ending one of those.
 */
export async function setAcceptsMessages(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const accepts = formData.get('accepts') === 'true';
  await supabase.from('talent_profiles').update({ accepts_messages: accepts }).eq('id', profile.id);
  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/talent/[slug]', 'page');
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
  const links = formData
    .getAll('link')
    .map((v) => cleanUrl(v))
    .filter((v): v is string => Boolean(v));
  if (links.some((v) => !/^https:\/\//i.test(v))) {
    errors.links = ['Every link must be a full https:// link.'];
  } else if (links.length > 10) {
    errors.links = ['Ten links at most.'];
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
    links: [...new Set(links)],
  };

  const { data: saved, error } = itemId
    ? await supabase
        .from('portfolio_items')
        .update(payload)
        .eq('id', itemId)
        .eq('talent_id', profile.id)
        .select('id')
        .maybeSingle()
    : await supabase
        .from('portfolio_items')
        .insert({ ...payload, talent_id: profile.id, sort_order: profile.portfolio_item_count })
        .select('id')
        .maybeSingle();

  if (error || !saved) return { ok: false, message: 'Could not save that project.' };

  // Photos added while creating the project. They are already in Storage (the browser uploads
  // them directly, frontend/components/upload/image-upload.tsx); these are the rows that point at them,
  // under the same rules as attachMedia: an https URL and real alt text, or not saved at all.
  if (!itemId) {
    const urls = formData.getAll('mediaUrl').map(String);
    const alts = formData.getAll('mediaAlt').map(String);
    const media = urls
      .slice(0, 10)
      .map((url, i) => itemMediaInput.safeParse({ url, altText: alts[i] ?? '', sortOrder: i }))
      .flatMap((r) => (r.success ? [r.data] : []));
    if (media.length) {
      await supabase.from('item_media').insert(
        media.map((m) => ({
          item_id: saved.id,
          url: m.url,
          alt_text: m.altText,
          sort_order: m.sortOrder,
        })),
      );
    }
  }

  // A project is part of the profile's embedded text, so the PROFILE is re-embedded, not just
  // the item. Embedding the item alone would leave the profile matching on a version of
  // itself that no longer exists.
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);

  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/browse');
  // The id comes back so the editor can open a NEW project straight into its photo section —
  // photos attach to a saved project, and making someone find it again to add one is a chore.
  return { ok: true, id: saved.id };
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
  // Removing a project changes what the profile says it has shipped.
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);

  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/browse');
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
  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/browse');
}

// ─────────────────────────── experience & education ───────────────────────────
//
// Plain rows under the profile, owned through talent_id (RLS: experience_write_own,
// education_write_own). The `.eq('talent_id', …)` on update/delete is belt-and-braces; the
// policy is what a crafted request has to get past.

export async function saveExperience(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '') || null;

  const parsed = experienceInput.safeParse({
    role: formData.get('role'),
    company: formData.get('company'),
    startDate: formData.get('startDate'),
    endDate: formData.get('endDate') ?? '',
    description: formData.get('description') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const row = {
    role: parsed.data.role,
    company: parsed.data.company,
    start_date: parsed.data.startDate,
    end_date: parsed.data.endDate,
    description: parsed.data.description,
  };

  const { error } = id
    ? await supabase.from('talent_experience').update(row).eq('id', id).eq('talent_id', profile.id)
    : await supabase.from('talent_experience').insert({ ...row, talent_id: profile.id });
  if (error) return { ok: false, message: 'Could not save that role.' };

  revalidateProfile();
  return { ok: true };
}

export async function deleteExperience(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await supabase.from('talent_experience').delete().eq('id', id).eq('talent_id', profile.id);
  revalidateProfile();
}

export async function saveEducation(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '') || null;

  const parsed = educationInput.safeParse({
    school: formData.get('school'),
    degree: formData.get('degree') ?? '',
    startYear: formData.get('startYear') ?? '',
    endYear: formData.get('endYear') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const row = {
    school: parsed.data.school,
    degree: parsed.data.degree,
    start_year: parsed.data.startYear,
    end_year: parsed.data.endYear,
  };

  const { error } = id
    ? await supabase.from('talent_education').update(row).eq('id', id).eq('talent_id', profile.id)
    : await supabase.from('talent_education').insert({ ...row, talent_id: profile.id });
  if (error) return { ok: false, message: 'Could not save that entry.' };

  revalidateProfile();
  return { ok: true };
}

export async function deleteEducation(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await supabase.from('talent_education').delete().eq('id', id).eq('talent_id', profile.id);
  revalidateProfile();
}

// ─────────────────────────── certifications ───────────────────────────
//
// Plain rows under the profile (RLS: certification_write_own, migration 0022). Unlike experience
// and education, certification names are part of the matching text (backend/src/matching/text.ts), so a
// change re-embeds the profile and drops its cached matches, like a project edit does.

export async function saveCertification(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '') || null;

  const parsed = certificationInput.safeParse({
    name: formData.get('name'),
    issuer: formData.get('issuer'),
    issuedOn: formData.get('issuedOn'),
    expiresOn: formData.get('expiresOn') ?? '',
    credentialId: formData.get('credentialId') ?? '',
    verificationUrl: formData.get('verificationUrl') ?? '',
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the fields below.', fields: fieldErrors(parsed.error) };
  }

  const row = {
    name: parsed.data.name,
    issuer: parsed.data.issuer,
    issued_on: parsed.data.issuedOn,
    expires_on: parsed.data.expiresOn,
    credential_id: parsed.data.credentialId,
    verification_url: parsed.data.verificationUrl,
  };

  const { error } = id
    ? await supabase
        .from('talent_certifications')
        .update(row)
        .eq('id', id)
        .eq('talent_id', profile.id)
    : await supabase.from('talent_certifications').insert({ ...row, talent_id: profile.id });
  if (error) return { ok: false, message: 'Could not save that certification.' };

  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);
  revalidateProfile();
  return { ok: true };
}

export async function deleteCertification(formData: FormData): Promise<void> {
  const { supabase, profile } = await requireTalent();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await supabase.from('talent_certifications').delete().eq('id', id).eq('talent_id', profile.id);
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);
  revalidateProfile();
}

function revalidateProfile() {
  revalidatePath('/dashboard/talent/profile');
  // The public page renders both sections.
  revalidatePath('/talent/[slug]', 'page');
}

/** Zod's field errors, flattened into the shape the forms render. */
function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
