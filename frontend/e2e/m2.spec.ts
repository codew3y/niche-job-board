import { expect, test, type Page } from '@playwright/test';
import type postgres from 'postgres';

import { connect, PASSWORD, seedSql, teardownSql, type SqlSeeded } from './sql-fixtures';

/**
 * M2 — the Phase 3 exit criterion.
 *
 * "Seed two real-looking accounts, post a job, apply, shortlist, all in production."
 *
 * This is the same shape as flows.spec.ts and a different claim. flows.spec.ts proves the
 * code is correct against a local stack; this proves the DEPLOYED system works — the Vercel
 * build, the hosted database, hosted auth, the production environment variables, and the
 * network between them. Those are exactly the things a local pass cannot speak for, and they
 * are where a deploy is actually wrong.
 *
 * Run it deliberately, never as part of the default suite:
 *
 *   E2E_BASE_URL=https://techselect.vercel.app \
 *   DATABASE_URL="<hosted>" npx playwright test frontend/e2e/m2.spec.ts
 *
 * It creates two accounts in the real database and deletes them afterwards. The teardown runs
 * even when an assertion fails, because a failed exit criterion should not also leave litter
 * in production.
 */

const DB_URL = process.env.DATABASE_URL;
const REMOTE = Boolean(process.env.E2E_BASE_URL);

test.describe.configure({ mode: 'serial' });
// A production round trip to ap-south-1 is an order of magnitude slower than a local build.
test.setTimeout(90_000);
test.skip(!DB_URL, 'M2 needs DATABASE_URL for the database it is exercising');

let sql: postgres.Sql;
let data: SqlSeeded;

test.beforeAll(async () => {
  const host = DB_URL!.replace(/.*@/, '').replace(/\/.*$/, '');
  const where = /127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE';
  // Say which database and which site. An exit criterion that silently ran against localhost
  // would be the most expensive false green in the project.
  console.info(`[m2] database: ${where} ${host}`);
  console.info(`[m2] site:     ${process.env.E2E_BASE_URL ?? 'local build on 3100'}`);

  sql = connect(DB_URL!);
  data = await seedSql(sql);
  console.info(`[m2] seeded run ${data.runId}`);
});

test.afterAll(async () => {
  if (sql && data) await teardownSql(sql, data);
  if (sql) await sql.end();
});

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/(dashboard|select-role|onboarding)/, { timeout: 30_000 });
}

test('1 — the deployed site is up and talking to the hosted database', async ({ page }) => {
  const response = await page.goto('/api/health');
  expect(response?.status()).toBe(200);
  const body = await page.evaluate(() => JSON.parse(document.body.innerText));

  expect(body.database).toBe('reachable');
  // Anonymous callers get status and database only; the configuration flags need the
  // operator secret.
  expect(body.config, 'health leaks configuration to anonymous callers').toBeUndefined();
  if (REMOTE && process.env.MATCH_WARM_SECRET) {
    const detailed = await page.request.get('/api/health', {
      headers: { authorization: `Bearer ${process.env.MATCH_WARM_SECRET}` },
    });
    const full = await detailed.json();
    // The production run also asserts the environment is complete, because a deploy missing
    // the service-role key passes every functional test here and sends no email at all.
    expect(full.config.serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY missing on the deploy').toBe(
      true,
    );
    expect(full.config.resendApiKey, 'RESEND_API_KEY missing on the deploy').toBe(true);
  }
});

test('2 — the seeded profile is publicly visible', async ({ page }) => {
  await page.goto(`/talent/${data.talent.slug}`);
  await expect(page.getByRole('heading', { name: /Stripe and Postgres developer/i })).toBeVisible();
  await expect(page.getByText(/failed payments/i)).toBeVisible();
});

test('3 — the job is public, indexable, and findable by search', async ({ page }) => {
  await page.goto(`/jobs/${data.job.slug}`);
  await expect(page.getByRole('heading', { name: data.job.title })).toBeVisible();

  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(ld ?? '{}')['@type']).toBe('JobPosting');

  /**
   * No waitForLoadState('networkidle') here. A deployed site behind a CDN keeps making
   * requests — fonts, prefetches, telemetry — so "idle" may never arrive, and the local run
   * passed only because a local build is quiet. Waiting for the element that must appear is
   * both faster and a stronger claim.
   */
  // The job page is public; searching for it happens in Browse, which is sign-in-only.
  await signIn(page, data.talent.email);
  await page.goto('/browse?type=jobs&q=subscription%20billing');
  await expect(page.locator(`a[href="/jobs/${data.job.slug}"]`)).toBeVisible({ timeout: 20_000 });
});

test('4 — the developer applies', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto(`/jobs/${data.job.slug}`);

  await page.getByRole('button', { name: /apply for this job/i }).click();
  await page
    .getByLabel(/why you fit/i)
    .fill(
      'I moved a marketplace off a homegrown subscription engine onto Stripe Billing last year, kept invoice history intact, and ran it reversible for six weeks. Happy to walk through how.',
    );
  await page.getByRole('button', { name: /send application/i }).click();

  await expect(page.getByText(/application sent/i)).toBeVisible({ timeout: 20_000 });
});

test('5 — the client sees it and shortlists', async ({ page }) => {
  await signIn(page, data.client.email);
  await page.goto(`/dashboard/client/jobs/${data.job.id}`);

  await expect(page.getByText(/Stripe and Postgres developer/i)).toBeVisible();
  await expect(page.getByText(/marketplace off a homegrown/i)).toBeVisible();

  await page
    .getByRole('button', { name: /shortlist/i })
    .first()
    .click();
  await expect(page.getByText(/shortlisted/i).first()).toBeVisible({ timeout: 20_000 });
});

test('6 — the developer sees the new status', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/applications');
  await expect(page.getByText(data.job.title)).toBeVisible();
  await expect(page.getByText(/shortlisted/i).first()).toBeVisible();
});

test('7 — the status change was recorded in the database, not just on screen', async () => {
  // The screen can lie about a write; the row cannot. This is what separates "the button
  // looked like it worked" from "the system did the thing".
  const [row] = await sql`
    select a.status from applications a
    where a.job_id = ${data.job.id} and a.talent_id = ${data.talent.profileId}`;
  expect(row?.status).toBe('shortlisted');

  // And the audit trail the trigger writes, which no application code touches.
  const events = await sql`
    select to_status from application_events
    where application_id = (select id from applications
                            where job_id = ${data.job.id} and talent_id = ${data.talent.profileId})
    order by at`;
  expect(events.map((e) => e.to_status)).toContain('shortlisted');
});
