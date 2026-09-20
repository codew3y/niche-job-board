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
   * the data behind it, which is why lib/db/rls.test.ts is a Phase 1 exit criterion rather
   * than a nicety.
   */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20, 'NEXT_PUBLIC_SUPABASE_ANON_KEY looks wrong.'),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

const serverSchema = z.object({
  /**
   * BYPASSES RLS ENTIRELY. Full read/write on every table regardless of policy. Server-side
   * only, never in a NEXT_PUBLIC_ variable, never logged.
   */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  /** The database owner connection. Migrations, seeding and service-role work only. */
  DATABASE_URL: z.string().startsWith('postgresql://').optional(),
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
