import { expect, test, type Browser, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Hiring closes the loop (gap analysis, urgent c): once a client hires someone on an open job,
 * the job page offers to mark it filled, and a filled job stops taking applications and says so.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
  return page;
}

test('after a hire, the client can mark the job filled, and it stops taking applications', async ({
  browser,
}) => {
  const dev = await signedIn(browser, data.talent.email);
  await dev.goto(`/jobs/${data.job.slug}`);
  await dev.getByRole('button', { name: /apply for this job/i }).click();
  await dev
    .getByLabel(/why you fit/i)
    .fill('I moved a homegrown subscription system onto Stripe last year, keeping its history.');
  await dev.getByRole('button', { name: /send application/i }).click();
  await expect(dev.getByText(/application sent/i)).toBeVisible({ timeout: 15_000 });

  const client = await signedIn(browser, data.client.email);
  await client.goto(`/dashboard/client/jobs/${data.job.id}`);
  // No offer before anyone is hired.
  await expect(client.getByRole('button', { name: 'Mark as filled' })).toHaveCount(0);

  await client.getByRole('button', { name: 'Shortlist' }).click();
  await expect(client.getByRole('button', { name: 'Hire' })).toBeVisible({ timeout: 15_000 });
  await client.getByRole('button', { name: 'Hire' }).click();

  await expect(client.getByText('You hired someone for this job.')).toBeVisible({
    timeout: 15_000,
  });
  await client.getByRole('button', { name: 'Mark as filled' }).click();
  await expect(client.getByText('You hired someone for this job.')).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(client.getByText('Filled', { exact: true }).first()).toBeVisible();

  // The public page says so, and offers no way to apply.
  await dev.goto(`/jobs/${data.job.slug}`);
  await expect(dev.getByText('This job has been filled.')).toBeVisible();
  await expect(dev.getByRole('button', { name: /apply for this job/i })).toHaveCount(0);
});
