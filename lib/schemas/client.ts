import { z } from 'zod';

import { optionalHttpsUrl, richText, trimmed } from './primitives';

export const clientProfileInput = z.object({
  companyName: trimmed.min(2, 'Company name is required.').max(120),
  website: optionalHttpsUrl,
  industry: trimmed.max(80).nullable().optional(),
  companySize: z
    .enum(['1-10', '11-50', '51-200', '201-500', '500+'])
    .nullable()
    .optional(),
  about: richText(2000, 'About').default(''),
  logoUrl: optionalHttpsUrl,
});

export type ClientProfileInput = z.infer<typeof clientProfileInput>;
