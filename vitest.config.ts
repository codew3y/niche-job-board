import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * `.env` is loaded explicitly here.
 *
 * Vitest does not put .env values on `process.env` by default, so reading
 * `process.env.DATABASE_URL` in this file silently fell back to localhost — meaning a run
 * aimed at a hosted database would have tested the local one and reported green. A test that
 * passes while measuring the wrong thing is worse than one that fails.
 *
 * The suites also name the host they connected to, as a test rather than a log line: vitest's
 * reporter only surfaces console output produced while a task is running, so the module-scope
 * console.info this file used to advertise was never printed even once. See
 * lib/db/test-target.ts.
 */
const env = { ...loadEnv('', process.cwd(), ''), ...process.env };
const DATABASE_URL = env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

/**
 * lib/env.ts validates the client variables at MODULE LOAD, so any test importing anything
 * that transitively reaches it fails at import with "Invalid client environment" — which
 * reads like a broken test rather than a missing variable. Forwarding them keeps the suite
 * running against the same configuration the app does.
 *
 * The fallbacks are obvious placeholders rather than plausible values: a test that needs a
 * real Supabase URL should fail loudly, not quietly talk to a decoy.
 */
const CLIENT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.test',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'test-anon-key-placeholder',
  NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL ?? 'https://techselect.vercel.app',
};

export default defineConfig({
  test: {
    // e2e/ belongs to Playwright. Vitest's default include picks up .spec.ts files and dies
    // importing @playwright/test, reporting two failed FILES alongside 337 passing tests —
    // a red suite that says nothing about the code.
    // (Written as line comments on purpose: a glob containing a star-slash ends a block
    // comment early, which is how this line broke the config the first time.)
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    // The database-backed suites share one database, so they must not run concurrently.
    fileParallelism: false,
    env: { DATABASE_URL, ...CLIENT_ENV },
  },
});
