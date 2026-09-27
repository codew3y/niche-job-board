import { z } from 'zod';

import { optionalHttpsUrl, richText, trimmed } from './primitives';

/**
 * The company sizes, exported so the form cannot drift from the validator.
 *
 * They were declared twice — once here as an enum, once in `components/client/company-form.tsx`
 * as a `SIZES` array — which is the shape every drift bug in this codebase has taken.
 */
export const companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'] as const;

/**
 * "" is a real answer, not a missing one.
 *
 * The size `<select>` opens on "Prefer not to say", whose value is the empty string, so the
 * empty string is what an untouched form posts. `z.enum(...).optional()` rejected it, which
 * made EVERY save fail while the form sat there saying nothing — the field had no error
 * surface, so a rejection rendered as a button that did nothing at all. Same treatment as
 * `optionalHttpsUrl`: accept blank, store null.
 */
const optionalCompanySize = z
  .union([z.enum(companySizes), z.literal('')])
  .nullable()
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

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
  companySize: optionalCompanySize,
  about: richText(2000, 'About').default(''),
  logoUrl: optionalHttpsUrl,
});

export type ClientProfileInput = z.infer<typeof clientProfileInput>;
