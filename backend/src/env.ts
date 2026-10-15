import { z } from 'zod';

/**
 * Environment validation — Phase 2 §6: "env validation at boot so a missing key fails loudly".
 *
 * The failure this prevents: a missing `SUPABASE_SERVICE_ROLE_KEY` in production does not
 * crash at boot. It crashes later, on one code path, as `undefined is not a string` inside a
 * library — at which point the deploy is already live and the stack trace names something
 * unrelated. Validating here turns that into a startup error that names the variable.
 *
 * Split into two schemas on purpose:
 *   - `clientEnv` is the subset safe to ship to the browser. Everything in it is
 *     `NEXT_PUBLIC_` and is readable by anyone who opens devtools.
 *   - `serverEnv` holds credentials that bypass RLS. Reading it from a Client Component is a
 *     build-time error (Next.js will not inline a non-public var), and the guard below turns
 *     any accidental runtime access into an immediate, explicit failure.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL must be the full https project URL.'),
  /**
   * Publishable by design. It identifies the project and nothing more — RLS is what protects
   * the data behind it, which is why backend/src/db/rls.test.ts is a Phase 1 exit criterion rather
   * than a nicety.
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks wrong.')
    .refine(
      (v) => !/\s/.test(v),
      'NEXT_PUBLIC_SUPABASE_ANON_KEY contains whitespace — it was probably pasted with a line break.',
    ),
  NEXT_PUBLIC_SITE_URL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.url().optional(),
  ),
  /**
   * Where people write about their data or the service: shown on /privacy and in the footer
   * when set. Optional, and blank counts as unset, so the site never shows "contact us" with a
   * broken or empty address.
   */
  NEXT_PUBLIC_CONTACT_EMAIL: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.email('NEXT_PUBLIC_CONTACT_EMAIL must be an email address.').optional(),
  ),
});

/**
 * `KEY=` in a .env file is how you say "not set", but dotenv loads it as an EMPTY STRING, not
 * as undefined. So `z.string().min(3).optional()` rejects it — `.optional()` only permits
 * undefined — and parseOrThrow takes down the WHOLE server environment over a variable nobody
 * filled in.
 *
 * That is not a theoretical failure. Adding a commented, blank `EMAIL_FROM=` to .env made
 * serverEnv() throw, which silently broke createServiceClient() and therefore every email,
 * and left /api/health reporting an empty config object.
 *
 * Blank is treated as absent, which is what the author of the file meant.
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

/**
 * A credential must contain no whitespace, and this is not pedantry.
 *
 * A service-role key reached production with a newline pasted into the MIDDLE of it. Every
 * presence check passed — the variable was set and long enough — and `fetch` then rejected it
 * with "invalid header value" on every call. Because email and matching are both designed so
 * that a failure never breaks the action that triggered it, this was invisible: notifications
 * silently sent nothing for days while the health endpoint reported the key as configured.
 *
 * Trimming it silently would be worse. A key that arrives mangled is a key someone pasted
 * wrong, and quietly repairing it hides the moment to fix it at the source — while an
 * internal newline is not even repairable by trimming.
 */
const noWhitespace = (label: string) =>
  z.string().refine((v) => !/\s/.test(v), {
    message: `${label} contains whitespace. It was probably pasted with a line break — copy it again, and check it is one unbroken line.`,
  });

const serverSchema = z.object({
  /**
   * BYPASSES RLS ENTIRELY. Full read/write on every table regardless of policy. Server-side
   * only, never in a NEXT_PUBLIC_ variable, never logged.
   */
  SUPABASE_SERVICE_ROLE_KEY: blankAsUndefined(
    noWhitespace('SUPABASE_SERVICE_ROLE_KEY').min(20).optional(),
  ),
  /** The database owner connection. Migrations, seeding and service-role work only. */
  DATABASE_URL: blankAsUndefined(z.string().startsWith('postgresql://').optional()),
  /**
   * Optional on purpose. Email is a notification, not a feature the product stops working
   * without — a missing key must degrade to "no mail was sent", never to a failed signup or a
   * failed application. backend/src/email/send.ts is what enforces that.
   */
  RESEND_API_KEY: blankAsUndefined(
    noWhitespace('RESEND_API_KEY')
      .startsWith('re_', 'RESEND_API_KEY should start with re_.')
      .optional(),
  ),
  /**
   * Who mail appears to come from. Defaults to Resend's shared sender, which needs no domain
   * and CAN ONLY DELIVER TO THE RESEND ACCOUNT OWNER'S OWN ADDRESS — see backend/src/email/send.ts.
   */
  EMAIL_FROM: blankAsUndefined(z.string().min(3).optional()),
  /**
   * Embeddings AND re-ranking, both on Gemini's free tier (the move to Gemini, superseding the original matching design's
   * OpenAI choice). One key for the whole matching pipeline.
   *
   * Absent means no matching: embeddings are not written, and the match feeds show their
   * honest empty state rather than an error. Nothing else in the product depends on it.
   */
  GEMINI_API_KEY: blankAsUndefined(noWhitespace('GEMINI_API_KEY').min(20).optional()),
  /**
   * Shared secret for the scheduled cache warmer. Without it the endpoint refuses every
   * request — an unauthenticated route that spends API quota is a free denial-of-wallet.
   */
  MATCH_WARM_SECRET: blankAsUndefined(z.string().min(16).optional()),
  /**
   * Who may open /dashboard/admin (the reports queue): a comma-separated list of the email
   * addresses they sign in with. Unset means nobody. Server-only: the list is never sent to a
   * browser, so it does not advertise whose accounts are worth taking over.
   */
  ADMIN_EMAILS: blankAsUndefined(z.string().min(3).optional()),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function parseOrThrow<T extends z.ZodType>(schema: T, source: unknown, label: string): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Name every missing or malformed variable at once. Reporting them one per restart turns
    // a 30-second fix into a ten-minute guessing game.
    const details = result.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `Invalid ${label} environment.\n${details}\n\n` +
        `Copy .env.example to .env and fill in the values. ` +
        `Supabase keys: Dashboard → Project → Settings → API.`,
    );
  }
  return result.data;
}

/**
 * Next.js inlines `process.env.NEXT_PUBLIC_*` at build time only when referenced statically,
 * so these must be written out in full rather than looked up dynamically.
 */
export const clientEnv = parseOrThrow(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  },
  'client',
);

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

/**
 * Server-only environment. A function rather than a constant so it is never evaluated during
 * a client bundle, and so the guard below can fire.
 */
export function serverEnv(): z.infer<typeof serverSchema> {
  if (typeof window !== 'undefined') {
    throw new Error(
      'serverEnv() was called in the browser. This would expose the service-role key, ' +
        'which bypasses every RLS policy. Move this call into a Server Component, a Server ' +
        'Action or a Route Handler.',
    );
  }
  cachedServerEnv ??= parseOrThrow(serverSchema, process.env, 'server');
  return cachedServerEnv;
}

/**
 * Absolute base URL, needed for OAuth callbacks and email links.
 *
 * Order matters: an explicit NEXT_PUBLIC_SITE_URL wins, then Vercel's per-deploy URL, then
 * localhost. Without the Vercel fallback every preview deployment would send OAuth users back
 * to production, which is the kind of bug that only appears on a preview branch.
 */
export function siteUrl(): string {
  if (clientEnv.NEXT_PUBLIC_SITE_URL) return clientEnv.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '');
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
