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
    headline: trimmed.min(10, 'Say what you do — at least 10 characters.').max(120),
    /**
     * Required, and required to have substance. This is the thin-profile mitigation from §8:
     * when someone's portfolio lives behind a URL the system never reads, the bio is the only
     * first-party text there is to embed. "Full-stack dev" produces a profile that matches
     * badly no matter how good the model is.
     */
    bio: richText(4000, 'Bio').min(
      120,
      'Tell us what you build, the stack you use, and a piece of work you are proud of — at least 120 characters. This is what matching reads.',
    ),
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
    skills: z
      .array(talentSkillInput)
      .min(1, 'Pick at least one skill so clients can find you.')
      .max(30, 'Pick your strongest 30 at most — a list of everything says nothing.'),
  })
  .refine(
    (v) =>
      v.hourlyRateMin === null || v.hourlyRateMax === null || Number(v.hourlyRateMin) <= Number(v.hourlyRateMax),
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
    techStack: z
      .array(trimmed.min(1).max(60))
      .max(20, 'Twenty technologies at most.')
      .default([]),
    repoUrl: optionalHttpsUrl,
    liveUrl: optionalHttpsUrl,
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
 * THE PUBLISH GATE (§5.4, ADR-004).
 *
 * A profile may be published only with a substantive bio AND at least one form of evidence:
 * an external site, or two or more in-app items. The same rule exists as the
 * `talent_publish_gate` CHECK constraint — that copy is the one that cannot be bypassed;
 * this copy exists to produce an error message that names what is actually missing, because
 * "validation failed" tells the user nothing about what to do next.
 */
export const publishGateInput = z.object({
  bio: trimmed,
  websiteUrl: z.string().nullable().optional(),
  portfolioItemCount: z.coerce.number().int().min(0),
});

export const publishTalentProfile = publishGateInput.superRefine((v, ctx) => {
  if (v.bio.length === 0) {
    ctx.addIssue({
      code: 'custom',
      path: ['bio'],
      message: 'Add a bio before publishing — it is what matching reads.',
    });
  }
  const hasSite = Boolean(v.websiteUrl);
  const hasItems = v.portfolioItemCount >= 2;
  if (!hasSite && !hasItems) {
    ctx.addIssue({
      code: 'custom',
      path: ['portfolioItems'],
      message:
        v.portfolioItemCount === 1
          ? 'One more project will do it — publish needs either a portfolio site link or two projects.'
          : 'Add a link to your portfolio site, or add two projects here.',
    });
  }
});

/** The completeness checklist the UI renders. Names the blocker rather than just refusing. */
export function publishBlockers(input: z.infer<typeof publishGateInput>): string[] {
  const result = publishTalentProfile.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => i.message);
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

export type TalentProfileInput = z.infer<typeof talentProfileInput>;
export type PortfolioItemInput = z.infer<typeof portfolioItemInput>;
