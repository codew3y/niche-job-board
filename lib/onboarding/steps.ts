/**
 * Onboarding step definitions.
 *
 * Progress is derived from what is actually SAVED, never from a counter in a cookie or a
 * client-held step index. The requirement is "progress saved per step so a refresh doesn't
 * lose work" (§6) — a stored index satisfies the letter of that and none of its intent,
 * because it can point at step 3 while step 2's data was never written.
 *
 * Deriving it means the resume banner and the wizard can never disagree with the database.
 */

export const TALENT_STEPS = [
  { slug: 'basics', title: 'About you', blurb: 'Your headline and what you build.' },
  { slug: 'skills', title: 'Skills & rates', blurb: 'What you work with, and what you charge.' },
  { slug: 'portfolio', title: 'Evidence', blurb: 'Link your site, or add projects here.' },
  { slug: 'review', title: 'Publish', blurb: 'A last look before you go live.' },
] as const;

export const CLIENT_STEPS = [
  { slug: 'company', title: 'Your company', blurb: 'Who candidates will be talking to.' },
  { slug: 'job', title: 'First brief', blurb: 'What you need built.' },
  { slug: 'review', title: 'Publish', blurb: 'A last look before it goes live.' },
] as const;

export type TalentStep = (typeof TALENT_STEPS)[number]['slug'];
export type ClientStep = (typeof CLIENT_STEPS)[number]['slug'];

export type TalentProgress = {
  hasBasics: boolean;
  hasSkills: boolean;
  hasEvidence: boolean;
  isPublished: boolean;
};

/** The first step that is not yet complete — where "resume" sends someone. */
export function nextTalentStep(p: TalentProgress): TalentStep {
  if (!p.hasBasics) return 'basics';
  if (!p.hasSkills) return 'skills';
  if (!p.hasEvidence) return 'portfolio';
  return 'review';
}

export function talentStepDone(step: TalentStep, p: TalentProgress): boolean {
  switch (step) {
    case 'basics':
      return p.hasBasics;
    case 'skills':
      return p.hasSkills;
    case 'portfolio':
      return p.hasEvidence;
    case 'review':
      return p.isPublished;
  }
}

export type ClientProgress = {
  hasCompany: boolean;
  hasJobDraft: boolean;
  hasPublishedJob: boolean;
};

export function nextClientStep(p: ClientProgress): ClientStep {
  if (!p.hasCompany) return 'company';
  if (!p.hasJobDraft) return 'job';
  return 'review';
}

export function clientStepDone(step: ClientStep, p: ClientProgress): boolean {
  switch (step) {
    case 'company':
      return p.hasCompany;
    case 'job':
      return p.hasJobDraft;
    case 'review':
      return p.hasPublishedJob;
  }
}

/**
 * URL-safe slug with a short random suffix.
 *
 * The suffix is not decoration: two people called Alex Chen must not collide, and retrying on
 * a unique-violation would leak how many people share a name.
 */
export function makeSlug(name: string): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'member';
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}
