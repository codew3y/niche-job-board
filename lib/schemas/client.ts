import { z } from 'zod';

import { optionalHttpsUrl, richText, trimmed } from './primitives';

const optionalText = (max: number) =>
  trimmed
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

export const clientProfileInput = z.object({
  /** The name on the client's briefs: their own, or a business's. Not necessarily a company. */
  companyName: trimmed.min(2, 'Add the name developers will see on your briefs.').max(120),
  website: optionalHttpsUrl,
  industry: optionalText(80),
  about: richText(2000, 'About').default(''),
  logoUrl: optionalHttpsUrl,
});

export type ClientProfileInput = z.infer<typeof clientProfileInput>;
