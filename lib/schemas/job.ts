import { z } from 'zod';

import { engagementType, experienceLevel, locationType } from './enums';
import { currency, optionalMoney, richText, slug, trimmed, uuid } from './primitives';

export const jobSkillInput = z.object({
  skillId: uuid,
  isRequired: z.boolean().default(true),
});

export const jobInput = z
  .object({
    title: trimmed.min(10, 'Give the role a descriptive title.').max(140),
    slug,
    description: richText(8000, 'Description').min(
      120,
      'Describe the work in at least 120 characters — short posts get poor matches.',
    ),
    responsibilities: richText(4000, 'Responsibilities').nullable().optional(),
    requirements: richText(4000, 'Requirements').nullable().optional(),
    engagementType,
    budgetMin: optionalMoney,
    budgetMax: optionalMoney,
    currency: currency.default('USD'),
    locationType: locationType.default('remote'),
    location: trimmed.max(120).nullable().optional(),
    experienceLevel: experienceLevel.nullable().optional(),
    deadline: z.coerce.date().nullable().optional(),
    skills: z
      .array(jobSkillInput)
      .min(1, 'Add at least one skill, or nobody can be matched to this job.')
      .max(20, 'Twenty skills at most — a long list matches nobody well.'),
  })
  .refine(
    (v) =>
      v.budgetMin === null || v.budgetMax === null || Number(v.budgetMin) <= Number(v.budgetMax),
    { path: ['budgetMax'], message: 'Maximum budget must be at least the minimum.' },
  )
  .refine((v) => v.skills.some((s) => s.isRequired), {
    path: ['skills'],
    message: 'Mark at least one skill as required — the match filter uses required skills.',
  })
  .refine((v) => v.locationType === 'remote' || Boolean(v.location?.trim()), {
    path: ['location'],
    message: 'Hybrid and onsite roles need a location, otherwise nobody can filter for them.',
  });

/**
 * Publishing applies the deadline rule; saving a draft does not. A draft written on Friday
 * with a Monday deadline should still be editable on Tuesday rather than refusing to save.
 */
export const publishJobInput = z
  .object({
    deadline: z.coerce.date().nullable().optional(),
  })
  .refine((v) => !v.deadline || v.deadline.getTime() > Date.now(), {
    path: ['deadline'],
    message: 'The deadline has already passed.',
  });

export type JobInput = z.infer<typeof jobInput>;
