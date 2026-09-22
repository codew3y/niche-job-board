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

export default defineConfig({
  test: {
    // The database-backed suites share one database, so they must not run concurrently.
    fileParallelism: false,
    env: { DATABASE_URL },
  },
});
