import { readFileSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * Load .env before anything reads process.env.
 *
 * Playwright does not do this, so the fixtures saw no SUPABASE_SERVICE_ROLE_KEY and the whole
 * flows suite SKIPPED — reporting "13 skipped" in green while testing nothing. That is the
 * same failure this repo has hit three times now (a vitest config that ignored .env, a
 * describe.skip resolved before beforeAll, an announcement that never printed), so the skip is
 * also made loud below rather than silent.
 *
 * Values already in the environment win, so CI and one-off overrides are not clobbered.
 */
function loadEnv() {
  try {
    for (const line of readFileSync('.env', 'utf8').split('\n')) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (!match) continue;
      const [, key, raw] = match;
      if (process.env[key!] === undefined) {
        process.env[key!] = raw!.replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    // No .env is fine — CI supplies real environment variables.
  }
}
loadEnv();

/**
 * E2E and the responsive audit.
 *
 * Runs against a real `next build` output via `next start`, not `next dev`. Dev mode has
 * different hydration timing, no route optimisation and looser error handling — passing there
 * and failing in production is the specific thing E2E is supposed to catch.
 *
 * `reuseExistingServer` locally so a dev loop does not rebuild every run; never in CI, where a
 * stale server would test the previous commit.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx next start -p 3100',
        url: 'http://127.0.0.1:3100/api/health',
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        // Resume import cannot call Gemini in tests: this fixed draft stands in for the model's
        // answer (lib/import/extract.ts; ignored on Vercel). Everything else runs for real.
        env: {
          ...(process.env as Record<string, string>),
          RESUME_IMPORT_FIXTURE: `${process.cwd()}/e2e/fixtures/resume-draft.json`,
          // The reports queue (e2e/admin.spec.ts) is for this test account only.
          ADMIN_EMAILS: 'e2e-admin@example.test',
        },
      },
});
