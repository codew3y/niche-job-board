'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { extractResume } from '@techselect/backend/import/extract';
import type { ResumeDraft } from '@techselect/backend/import/resume-schema';
import { mapSkills } from '@techselect/backend/import/skills-map';
import { invalidate } from '@techselect/backend/matching/cache';
import { embedInBackground } from '@techselect/backend/matching/ingest';
import {
  certificationInput,
  educationInput,
  experienceInput,
} from '@techselect/backend/schemas/talent';
import { safePath } from '@techselect/backend/security/safe-path';
import { createClient } from '@techselect/backend/supabase/server';

/**
 * Resume import, in two steps:
 *
 *   1. readResume  — the PDF goes up, a draft comes back to the person's own browser. Nothing is
 *                    written to their profile. The file is not stored.
 *   2. applyResume — the person sends back only what they ticked on the review screen. Every item
 *                    is re-validated here with the same rules as the manual forms (the browser
 *                    copy of the draft is untrusted input like any other), then written.
 *
 * Nothing is overwritten that the person did not explicitly choose: headline and bio are only
 * sent when ticked, and rows are added alongside existing ones, never replacing them.
 */

async function requireTalent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');
  return { supabase, profile };
}

export type ReadResumeResult =
  | {
      ok: true;
      draft: ResumeDraft;
      skills: { matched: { id: string; name: string; from: string }[]; unmatched: string[] };
    }
  | { ok: false; message: string };

export async function readResume(
  _prev: ReadResumeResult | null,
  formData: FormData,
): Promise<ReadResumeResult> {
  const { supabase } = await requireTalent();

  if (formData.get('consent') !== 'on') {
    return { ok: false, message: 'Tick the box to confirm how your resume is read.' };
  }
  const file = formData.get('resume');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: 'Choose your resume PDF first.' };
  }

  const result = await extractResume(file);
  if (!result.ok) return result;

  const { data: taxonomy } = await supabase
    .from('skills')
    .select('id, name, aliases')
    .eq('is_approved', true);
  return { ok: true, draft: result.draft, skills: mapSkills(result.draft.skills, taxonomy ?? []) };
}

// ─────────────────────────── apply ───────────────────────────

/** What the review screen sends back: only ticked items. Shapes, not trust (each is re-checked). */
const selection = z.object({
  headline: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().optional(),
  skillIds: z.array(z.string().uuid()).max(60).default([]),
  experience: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
  education: z.array(z.record(z.string(), z.unknown())).max(10).default([]),
  projects: z.array(z.record(z.string(), z.unknown())).max(10).default([]),
  certifications: z.array(z.record(z.string(), z.unknown())).max(20).default([]),
});

export type ApplyResult = { ok: false; message: string } | null;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export async function applyResume(_prev: ApplyResult, formData: FormData): Promise<ApplyResult> {
  const { supabase, profile } = await requireTalent();

  let picked: z.infer<typeof selection>;
  try {
    const parsed = selection.safeParse(JSON.parse(String(formData.get('selection') ?? '{}')));
    if (!parsed.success) return { ok: false, message: 'Something in the selection was not valid.' };
    picked = parsed.data;
  } catch {
    return { ok: false, message: 'Something in the selection was not valid.' };
  }

  const added = {
    details: 0,
    skills: 0,
    experience: 0,
    education: 0,
    projects: 0,
    certifications: 0,
  };
  let skipped = 0;

  // Headline, bio, website: only what was ticked, with the profile form's rules.
  const update: Record<string, string> = {};
  if (picked.headline !== undefined) {
    const h = picked.headline.trim();
    if (h.length >= 10 && h.length <= 120) update.headline = h;
    else skipped++;
  }
  if (picked.bio !== undefined) {
    const b = picked.bio.trim();
    if (b.length <= 4000) update.bio = b;
    else skipped++;
  }
  if (picked.website !== undefined) {
    const w = picked.website.trim().replace(/\/+$/, '');
    if (/^https:\/\/\S+$/i.test(w)) update.website_url = w;
    else skipped++;
  }
  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from('talent_profiles').update(update).eq('id', profile.id);
    if (error) return { ok: false, message: 'Could not save your details. Try again.' };
    added.details = Object.keys(update).length;
  }

  // Skills: added to what is there, up to the profile's 30.
  if (picked.skillIds.length > 0) {
    const { data: current } = await supabase
      .from('talent_skills')
      .select('skill_id')
      .eq('talent_id', profile.id);
    const have = new Set((current ?? []).map((r) => r.skill_id));
    const room = Math.max(0, 30 - have.size);
    const fresh = picked.skillIds.filter((id) => !have.has(id));
    const toAdd = fresh.slice(0, room);
    skipped += fresh.length - toAdd.length;
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('talent_skills')
        .insert(toAdd.map((skill_id) => ({ talent_id: profile.id, skill_id })));
      if (error) skipped += toAdd.length;
      else added.skills = toAdd.length;
    }
  }

  // Experience, education, certifications: the same zod inputs the editors use.
  const experienceRows = picked.experience.flatMap((e) => {
    const r = experienceInput.safeParse({
      role: str(e.role),
      company: str(e.company),
      startDate: str(e.start),
      endDate: e.current ? '' : str(e.end),
      description: str(e.description),
    });
    if (!r.success) {
      skipped++;
      return [];
    }
    return [
      {
        talent_id: profile.id,
        role: r.data.role,
        company: r.data.company,
        start_date: r.data.startDate,
        end_date: r.data.endDate,
        description: r.data.description,
      },
    ];
  });
  if (experienceRows.length > 0) {
    const { error } = await supabase.from('talent_experience').insert(experienceRows);
    if (error) skipped += experienceRows.length;
    else added.experience = experienceRows.length;
  }

  const educationRows = picked.education.flatMap((e) => {
    const r = educationInput.safeParse({
      school: str(e.school),
      degree: str(e.degree),
      startYear: e.startYear ?? '',
      endYear: e.endYear ?? '',
    });
    if (!r.success) {
      skipped++;
      return [];
    }
    return [
      {
        talent_id: profile.id,
        school: r.data.school,
        degree: r.data.degree,
        start_year: r.data.startYear,
        end_year: r.data.endYear,
      },
    ];
  });
  if (educationRows.length > 0) {
    const { error } = await supabase.from('talent_education').insert(educationRows);
    if (error) skipped += educationRows.length;
    else added.education = educationRows.length;
  }

  const certificationRows = picked.certifications.flatMap((c) => {
    const r = certificationInput.safeParse({
      name: str(c.name),
      issuer: str(c.issuer),
      issuedOn: str(c.issued),
      expiresOn: str(c.expires),
      credentialId: str(c.credentialId),
      verificationUrl: str(c.url),
    });
    if (!r.success) {
      skipped++;
      return [];
    }
    return [
      {
        talent_id: profile.id,
        name: r.data.name,
        issuer: r.data.issuer,
        issued_on: r.data.issuedOn,
        expires_on: r.data.expiresOn,
        credential_id: r.data.credentialId,
        verification_url: r.data.verificationUrl,
      },
    ];
  });
  if (certificationRows.length > 0) {
    const { error } = await supabase.from('talent_certifications').insert(certificationRows);
    if (error) skipped += certificationRows.length;
    else added.certifications = certificationRows.length;
  }

  // Projects: the project editor's rules (title 3+, description 40+, https links, 10 at most).
  let order = profile.portfolio_item_count;
  const projectRows = picked.projects.flatMap((p) => {
    const title = str(p.title).slice(0, 120);
    const description = str(p.description).slice(0, 2000);
    if (title.length < 3 || description.length < 40) {
      skipped++;
      return [];
    }
    const techStack = Array.isArray(p.techStack)
      ? p.techStack
          .filter((t): t is string => typeof t === 'string')
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const links = Array.isArray(p.links)
      ? [
          ...new Set(
            p.links
              .filter(
                (l): l is string => typeof l === 'string' && /^https:\/\/\S+$/i.test(l.trim()),
              )
              .map((l) => l.trim()),
          ),
        ].slice(0, 10)
      : [];
    return [
      {
        talent_id: profile.id,
        title,
        description,
        role: str(p.role).slice(0, 120) || null,
        outcome: str(p.outcome).slice(0, 500) || null,
        tech_stack: techStack,
        links,
        sort_order: order++,
      },
    ];
  });
  if (projectRows.length > 0) {
    const { error } = await supabase.from('portfolio_items').insert(projectRows);
    if (error) skipped += projectRows.length;
    else added.projects = projectRows.length;
  }

  // What matching reads changed (headline, bio, skills, projects, certifications).
  embedInBackground('talent_profile', profile.id);
  void invalidate('talent', profile.id);
  revalidatePath('/dashboard/talent/profile');
  revalidatePath('/talent/[slug]', 'page');

  const total = Object.values(added).reduce((a, b) => a + b, 0);
  const target = safePath(formData.get('returnTo')) ?? '/dashboard/talent/profile';
  const url = new URL(target, 'http://x');
  url.searchParams.set('imported', String(total));
  if (skipped > 0) url.searchParams.set('skipped', String(skipped));
  redirect(`${url.pathname}${url.search}`);
}
