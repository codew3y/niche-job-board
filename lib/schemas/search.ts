import { z } from 'zod';

import { engagementType, experienceLevel, locationType } from './enums';
import { paginationParams, trimmed } from './primitives';

/** Query-string params arrive as strings, so everything here coerces. */
const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) =>
    v === undefined ? [] : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean),
  );

export const jobSearchParams = paginationParams.extend({
  q: trimmed.max(200).optional(),
  skills: csv,
  engagement: engagementType.optional(),
  locationType: locationType.optional(),
  experience: experienceLevel.optional(),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  sort: z.enum(['recent', 'budget_high', 'budget_low']).default('recent'),
});

export const talentSearchParams = paginationParams.extend({
  q: trimmed.max(200).optional(),
  skills: csv,
  techStack: csv,
  availability: z.enum(['full_time', 'part_time', 'occasional']).optional(),
  rateMin: z.coerce.number().min(0).optional(),
  rateMax: z.coerce.number().min(0).optional(),
});

export type JobSearchParams = z.infer<typeof jobSearchParams>;
