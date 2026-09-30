import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The public company page, /company/<id>: who a client is and what they have open.
 *
 * Public like the job and developer detail pages, because it is where a job's company name
 * leads. These tests pin that it opens signed out, lists the open job, is linked from the job
 * page and from the owner's profile menu, and returns a real 404 for an id that is not a company.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

const company = () => `E2E Co ${data.runId}`;

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
}

test('opens signed out, with the company and its open job', async ({ page }) => {
  const res = await page.goto(`/company/${data.client.profileId}`);
  expect(res?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: company() })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Open jobs' })).toBeVisible();
  await expect(page.getByText('1 open job')).toBeVisible();
  await page.getByRole('link', { name: data.job.title }).first().click();
  await expect(page).toHaveURL(new RegExp(`/jobs/${data.job.slug}$`));
  // Not the owner: no edit banner.
  await page.goBack();
  await expect(page.getByText('This is how developers see your company.')).toHaveCount(0);
});

test('the job page links its company name to the company page', async ({ page }) => {
  await page.goto(`/jobs/${data.job.slug}`);
  await page.getByRole('link', { name: company(), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/company/${data.client.profileId}$`));
});

test('an id that is not a company is a real 404', async ({ page }) => {
  // A well-formed uuid that matches nothing, and a malformed one (never sent to Postgres).
  for (const id of ['00000000-0000-4000-8000-000000000000', 'not-a-uuid']) {
    const res = await page.goto(`/company/${id}`);
    expect(res?.status(), id).toBe(404);
  }
});

test('the owner reaches it from View profile and can edit from it', async ({ page }) => {
  await signIn(page, data.client.email);
  await page.getByRole('button', { name: /profile menu/i }).click();
  await page.getByRole('menuitem', { name: 'View profile' }).click();
  await expect(page).toHaveURL(new RegExp(`/company/${data.client.profileId}$`));
  await expect(page.getByText('This is how developers see your company.')).toBeVisible();
  await page.getByRole('link', { name: 'Edit company' }).click();
  await expect(page).toHaveURL(/\/dashboard\/client\/profile$/);
  await expect(page.getByRole('link', { name: 'View public page' })).toHaveAttribute(
    'href',
    `/company/${data.client.profileId}`,
  );
});
