import { z } from 'zod';

import { availability, proficiency } from './enums';
import {
  currency,
  httpsUrl,
  optionalHttpsUrl,
  optionalMoney,
  richText,
  slug,
  trimmed,
  uuid,
} from './primitives';

/** A skill tagged on a profile. Skills come from the seeded taxonomy — never free text. */
export const talentSkillInput = z.object({
  skillId: uuid,
  proficiency: proficiency.default('proficient'),
  years: z.coerce.number().int().min(0).max(50).nullable().optional(),
});

export const talentProfileInput = z
  .object({
    slug,
    /**
     * The one field still required, and it is not an evidence gate: the headline IS the
     * profile's name everywhere it appears — browse cards, the inbox, the public page's
     * <h1>. A row without one renders as a blank card with a link. Three characters, which
     * is a check that something was typed rather than a judgement about what.
     */
    headline: trimmed.min(3, 'Give your profile a title — even just what you do.').max(120),
    /**
     * Optional, with no minimum (ADR-008). It used to require 120 characters as a
     * thin-profile mitigation; that gate is gone along with every other one.
     *
     * The advice still holds and is now given as a hint rather than enforced as a rule: the
     * bio is the only first-party text the matching layer can read, so "Full-stack dev"
     * produces a profile that ranks badly however good the model is. That is a consequence
     * the author chooses, not a door the platform closes.
     */
    bio: richText(4000, 'Bio').default(''),
    hourlyRateMin: optionalMoney,
    hourlyRateMax: optionalMoney,
    currency: currency.default('USD'),
    availability: availability.default('part_time'),
    yearsExperience: z.coerce.number().int().min(0).max(60).nullable().optional(),
    timezone: trimmed.max(64).nullable().optional(),
    websiteUrl: optionalHttpsUrl,
    githubUrl: optionalHttpsUrl,
    linkedinUrl: optionalHttpsUrl,
    acceptsMessages: z.boolean().default(true),
    /**
     * No minimum. A profile with no skills is publishable — it simply will not appear under
     * any skill filter, which is the author's trade to make.
     */
    skills: z
      .array(talentSkillInput)
      .max(30, 'Pick your strongest 30 at most — a list of everything says nothing.')
      .default([]),
  })
  .refine(
    (v) =>
      v.hourlyRateMin === null ||
      v.hourlyRateMax === null ||
      Number(v.hourlyRateMin) <= Number(v.hourlyRateMax),
    { path: ['hourlyRateMax'], message: 'Maximum rate must be at least the minimum.' },
  );

export const portfolioItemInput = z
  .object({
    title: trimmed.min(3, 'Give the project a name.').max(120),
    description: richText(2000, 'Description').min(
      40,
      'Describe what the project was and what you did — at least 40 characters.',
    ),
    role: trimmed.max(120).nullable().optional(),
    /** What changed because of the work. This is the field that makes an entry credible. */
    outcome: richText(500, 'Outcome').nullable().optional(),
    techStack: z.array(trimmed.min(1).max(60)).max(20, 'Twenty technologies at most.').default([]),
    /** Any number of links — repo, live site, write-up. https only, ten at most (migration 0020). */
    links: z.array(httpsUrl).max(10, 'Ten links at most.').default([]),
    coverImageUrl: optionalHttpsUrl,
    startedAt: z.coerce.date().nullable().optional(),
    endedAt: z.coerce.date().nullable().optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
  })
  .refine((v) => !v.startedAt || !v.endedAt || v.startedAt <= v.endedAt, {
    path: ['endedAt'],
    message: 'End date cannot be before the start date.',
  });

/**
 * THERE IS NO PUBLISH GATE (ADR-008, superseding ADR-004).
 *
 * `publishTalentProfile` and `publishBlockers()` used to live here and refuse a profile that
 * had no bio and neither a portfolio site nor two projects. Both are gone, along with the
 * `talent_publish_gate` CHECK constraint they mirrored (migration 0014).
 *
 * What replaces them is advice, not enforcement. `profileSuggestions()` returns the same
 * observations the blockers used to make — no bio, no evidence, no skills — as things worth
 * doing rather than reasons to refuse. The profile publishes either way.
 *
 * The distinction matters in the UI: a blocker disables the button, a suggestion does not.
 */
export const publishGateInput = z.object({
  bio: trimmed.default(''),
  websiteUrl: z.string().nullable().optional(),
  portfolioItemCount: z.coerce.number().int().min(0).default(0),
  skillCount: z.coerce.number().int().min(0).default(0),
});

/**
 * What would make this profile land better, in priority order. Never blocks publishing.
 *
 * Worded as consequences rather than instructions — "clients cannot see what you have built"
 * says why it matters; "add a portfolio" is a platform telling someone how to present
 * themselves, which is the thing we just stopped doing.
 */
export function profileSuggestions(input: z.input<typeof publishGateInput>): string[] {
  const v = publishGateInput.parse(input);
  const out: string[] = [];

  if (v.bio.trim().length < 120) {
    out.push(
      'A fuller bio is the main thing matching reads — a few sentences on what you build and the stack you use will place you better.',
    );
  }
  if (!v.websiteUrl && v.portfolioItemCount === 0) {
    out.push(
      'Nothing here shows your work yet. A portfolio link or a project gives a client something to judge.',
    );
  }
  if (v.skillCount === 0) {
    out.push('Without skills tagged, you will not appear under any skill filter.');
  }
  return out;
}

export const talentLinksInput = z.object({
  websiteUrl: optionalHttpsUrl,
  githubUrl: optionalHttpsUrl,
  linkedinUrl: optionalHttpsUrl,
});

export const itemMediaInput = z.object({
  url: httpsUrl,
  /** Required, not optional. Alt text is an accessibility gate (§9), enforced NOT NULL. */
  altText: trimmed
    .min(3, 'Describe the image for people who cannot see it.')
    .max(300, 'Keep alt text under 300 characters.'),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

/**
 * The profile form as edited on /dashboard/talent/profile. One hourly rate, not a range: it is
 * stored in both hourly_rate_min and hourly_rate_max, so browse filtering and the rate display
 * (which already collapse an equal pair to one number) are unchanged.
 */
export const profileDetailsInput = z.object({
  headline: trimmed.min(3, 'Give your profile a title — even just what you do.').max(120),
  bio: richText(4000, 'Bio').default(''),
  hourlyRate: optionalMoney,
  currency: currency.default('USD'),
  availability: availability.default('part_time'),
  yearsExperience: z.coerce.number().int().min(0).max(60).nullable().optional(),
  timezone: trimmed.max(64).nullable().optional(),
  websiteUrl: optionalHttpsUrl,
  githubUrl: optionalHttpsUrl,
  linkedinUrl: optionalHttpsUrl,
});

/** `<input type="month">` posts "YYYY-MM"; the column is a date, so it becomes the 1st. */
const monthDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Pick a month.')
  .transform((v) => (v.length === 7 ? `${v}-01` : v));

export const experienceInput = z
  .object({
    role: trimmed.min(2, 'What was your role?').max(120),
    company: trimmed.min(1, 'Where was it?').max(120),
    startDate: monthDate,
    /** Blank = still there. */
    endDate: z
      .union([monthDate, z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    description: richText(2000, 'Description').default(''),
  })
  .refine((v) => !v.endDate || v.startDate <= v.endDate, {
    path: ['endDate'],
    message: 'End cannot be before the start.',
  });

const optionalYear = z
  .union([
    z.coerce.number().int().min(1950, 'After 1950.').max(2100, 'Before 2100.'),
    z.literal(''),
  ])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

/**
 * A certification (migration 0022). LinkedIn's fields: name, issuing organisation, issue and
 * optional expiry month, optional credential ID and verification link. The verification link is
 * https only, like every link in the product.
 */
export const certificationInput = z
  .object({
    name: trimmed.min(2, 'Name the certification.').max(200),
    issuer: trimmed.min(1, 'Who issued it?').max(160),
    issuedOn: monthDate,
    /** Blank = does not expire. */
    expiresOn: z
      .union([monthDate, z.literal('')])
      .optional()
      .transform((v) => (v ? v : null)),
    credentialId: trimmed
      .max(200, 'Keep the credential ID under 200 characters.')
      .optional()
      .transform((v) => (v ? v : null)),
    verificationUrl: optionalHttpsUrl,
  })
  .refine((v) => !v.expiresOn || v.issuedOn <= v.expiresOn, {
    path: ['expiresOn'],
    message: 'Expiry cannot be before the issue date.',
  });

export const educationInput = z
  .object({
    school: trimmed.min(2, 'Which school?').max(160),
    degree: richText(160, 'Degree').default(''),
    startYear: optionalYear,
    endYear: optionalYear,
  })
  .refine((v) => v.startYear === null || v.endYear === null || v.startYear <= v.endYear, {
    path: ['endYear'],
    message: 'End year cannot be before the start year.',
  });

export type TalentProfileInput = z.infer<typeof talentProfileInput>;
export type PortfolioItemInput = z.infer<typeof portfolioItemInput>;

/**
 * A LinkedIn member profile address: https, linkedin.com (any country subdomain), /in/<handle>.
 * The only LinkedIn link a connected account may add (migration 0021); company pages, posts and
 * look-alike domains are refused.
 */
export const LINKEDIN_PROFILE_URL =
  /^https:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%.]{2,100}\/?$/i;
