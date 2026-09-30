import { z } from 'zod';

import { engagementType, experienceLevel, locationType } from './enums';
import { paginationParams, trimmed } from './primitives';

/** Query-string params arrive as strings, so everything here coerces. */
const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) =>
    v === undefined
      ? []
      : (Array.isArray(v) ? v : v.split(',')).map((s) => s.trim()).filter(Boolean),
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
  /**
   * `techStack` was here and was never read by listTalent. Removed rather than wired:
   * portfolio_items.tech_stack is free text a user types into a comma-separated box, so
   * filtering it matches "Next.js" and misses "nextjs". Skill filtering over the curated
   * taxonomy is the structured version of the same intent.
   */
  availability: z.enum(['full_time', 'part_time', 'occasional']).optional(),
  rateMin: z.coerce.number().min(0).optional(),
  rateMax: z.coerce.number().min(0).optional(),
});

/**
 * Which list /browse shows. Jobs and developers are one page with this as a filter; anything
 * unrecognised falls back to "all" rather than erroring, because it is a query string.
 */
export const browseType = z.enum(['all', 'jobs', 'developers']).catch('all');
export type BrowseType = z.infer<typeof browseType>;

export type JobSearchParams = z.infer<typeof jobSearchParams>;
export type TalentSearchParams = z.infer<typeof talentSearchParams>;
