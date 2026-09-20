import { z } from 'zod';

/**
 * Shared primitives — Phase 1 §5.4.
 *
 * One schema per entity, used in three places: the client form (React Hook Form +
 * zodResolver), the first statement of every server action, and — for anything expressible
 * as a constraint — the database itself. The database copies are in lib/db/schema/*; where a
 * rule exists in both, the CHECK constraint is the one that cannot be bypassed.
 */

/** Trim before validating, so "   " is empty rather than three characters. */
export const trimmed = z.string().trim();

export const uuid = z.uuid({ message: 'Must be a valid id.' });

/**
 * External links are the main untrusted-input surface in this product: a talent profile can
 * be published on the strength of one (ADR-004), and every one is rendered as a clickable
 * link on a public page.
 *
 * Rules, mirrored by the `*_urls_https` CHECK constraints:
 *   - https only. Not http, and emphatically not `javascript:` or `data:`, which are the
 *     XSS vectors a URL field invites.
 *   - length capped, so a URL cannot be used as a storage field or to blow up a page.
 *   - trailing slash normalised, so `https://x.dev` and `https://x.dev/` are one value and
 *     do not produce two "different" profiles.
 *
 * Note `z.url()` alone is not sufficient: it accepts `javascript:alert(1)` as a well-formed
 * URL. The protocol check is the part that matters.
 */
export const httpsUrl = trimmed
  .max(2048, 'Link is too long (max 2048 characters).')
  .refine((v) => {
    try {
      return new URL(v).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Must be a full https:// link.')
  .transform((v) => v.replace(/\/+$/, ''));

export const optionalHttpsUrl = z
  .union([httpsUrl, z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

/** ISO 4217. The project spans CHF, EUR, GBP and USD and must never conflate them (§7). */
export const currency = trimmed
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code, e.g. USD.');

export const slug = trimmed
  .min(3, 'Too short.')
  .max(60, 'Too long.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens only.');

/**
 * Free text destined for a public page. Length-bounded here; SANITISED SERVER-SIDE
 * separately — never trust a client-side sanitiser, and never treat a Zod schema as one.
 * Zod validates shape, not safety.
 */
export const richText = (max: number, label = 'This field') =>
  trimmed.max(max, `${label} is too long (max ${max} characters).`);

/** Money as a string, to avoid float drift. Matches the numeric columns in the schema. */
export const money = trimmed
  .regex(/^\d{1,10}(\.\d{1,2})?$/, 'Enter an amount like 1500 or 1500.00')
  .refine((v) => Number(v) >= 0, 'Cannot be negative.');

export const optionalMoney = z
  .union([money, z.literal('')])
  .optional()
  .transform((v) => (v === '' || v === undefined ? null : v));

/** Cursor pagination on every list endpoint — never offset (§5.2). */
export const paginationParams = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** The typed error codes every endpoint returns (§5.2). */
export const errorCode = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL',
]);
export type ErrorCode = z.infer<typeof errorCode>;
