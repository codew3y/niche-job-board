import { z } from 'zod';

import { optionalHttpsUrl, richText, trimmed } from './primitives';

const optionalText = (max: number) =>
  trimmed
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v ? v : null));

export const clientProfileInput = z.object({
  companyName: trimmed.min(2, 'Company name is required.').max(120),
  website: optionalHttpsUrl,
  industry: optionalText(80),
  about: richText(2000, 'About').default(''),
  logoUrl: optionalHttpsUrl,
});

export type ClientProfileInput = z.infer<typeof clientProfileInput>;
