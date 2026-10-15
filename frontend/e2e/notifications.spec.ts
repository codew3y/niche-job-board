import { expect, test, type Browser, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * In-app notifications (gap analysis, urgent a): a developer applies, and the client sees a
 * count on the bell, the notification itself linking to the applicants, and the count clearing
 * once they have looked.
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

test('an application lights the client bell, and looking clears it', async ({ browser }) => {
  const dev = await signedIn(browser, data.talent.email);
  await dev.goto(`/jobs/${data.job.slug}`);
  await dev.getByRole('button', { name: /apply for this job/i }).click();
  await dev
    .getByLabel(/why you fit/i)
    .fill('I moved a homegrown subscription system onto Stripe last year, keeping its history.');
  await dev.getByRole('button', { name: /send application/i }).click();
  await expect(dev.getByText(/application sent/i)).toBeVisible({ timeout: 15_000 });

  const client = await signedIn(browser, data.client.email);
  const nav = client.getByRole('navigation', { name: 'Main' }).first();
  const bell = nav.getByRole('link', { name: /Notifications/ });
  // The notification is written right after the application, in the background.
  await expect
    .poll(
      async () => {
        await client.reload();
        return bell.getByText('new notifications').count();
      },
      { timeout: 15_000 },
    )
    .toBe(1);

  await bell.click();
  await expect(client).toHaveURL(/\/dashboard\/notifications$/);
  const item = client.getByRole('link', {
    name: new RegExp(`New application for ${data.job.title}`),
  });
  await expect(item).toBeVisible();
  await expect(item).toHaveAttribute('href', `/dashboard/client/jobs/${data.job.id}`);

  // Looking marks them read: the badge clears.
  await expect
    .poll(
      async () => {
        await client.reload();
        return bell.getByText('new notifications').count();
      },
      { timeout: 15_000 },
    )
    .toBe(0);
});
