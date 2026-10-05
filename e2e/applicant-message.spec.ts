import { expect, test, type Browser, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Messaging an applicant from the job's applicant list (gap analysis, urgent b). The page said
 * "message them" and offered no way to; now each applicant has a Message button, with the
 * conversation already about this job.
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

test('a client messages an applicant about the job they applied to', async ({ browser }) => {
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
  await client
    .getByRole('button', { name: /^Message / })
    .first()
    .click();

  const dialog = client.getByRole('dialog');
  // Already about this job.
  await expect(dialog.getByLabel(/About a job/)).toHaveValue(data.job.id);
  await dialog
    .getByLabel('Message', { exact: true })
    .fill(
      'Thanks for applying. Could you walk us through the history backfill on a call this week?',
    );
  await dialog.getByRole('button', { name: 'Send message' }).click();
  await client.waitForURL(/\/dashboard\/messages\/[0-9a-f-]{36}$/);
  await expect(client.getByText(data.job.title).first()).toBeVisible();

  await dev.goto('/dashboard/messages');
  await expect(dev.getByText(/walk us through the history backfill/)).toBeVisible();
});
