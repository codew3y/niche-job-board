import { expect, test, type Browser, type Page } from '@playwright/test';

import { admin, canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Reporting a profile or a job (gap analysis, urgent d). Previously only a conversation could
 * be reported, although the database accepted profile and job reports.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) {
    await admin().from('reports').delete().in('subject_id', [data.talent.profileId, data.job.id]);
    await teardown(data);
  }
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

async function report(page: Page, button: string, reason: string) {
  await page.getByRole('button', { name: button }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('What is wrong?').fill(reason);
  await dialog.getByRole('button', { name: 'Send report' }).click();
  await expect(dialog.getByText('A person reads these')).toBeVisible();
  await expect(dialog.getByText('It stays visible until it has been reviewed.')).toBeVisible();
}

test('a client can report a profile and a developer can report a job', async ({ browser }) => {
  const client = await signedIn(browser, data.client.email);
  await client.goto(`/talent/${data.talent.slug}`);
  await report(client, 'Report this profile', 'This profile copies another developer’s projects.');

  const dev = await signedIn(browser, data.talent.email);
  await dev.goto(`/jobs/${data.job.slug}`);
  await report(dev, 'Report this job', 'The job asks applicants to pay a fee before starting.');

  const { data: rows } = await admin()
    .from('reports')
    .select('subject_type, subject_id')
    .in('subject_id', [data.talent.profileId, data.job.id]);
  expect(rows).toEqual(
    expect.arrayContaining([
      { subject_type: 'profile', subject_id: data.talent.profileId },
      { subject_type: 'job', subject_id: data.job.id },
    ]),
  );
});

test('owners and signed-out visitors are not offered a report button', async ({
  browser,
  page,
}) => {
  await page.goto(`/talent/${data.talent.slug}`);
  await expect(page.getByRole('button', { name: 'Report this profile' })).toHaveCount(0);
  await page.goto(`/jobs/${data.job.slug}`);
  await expect(page.getByRole('button', { name: 'Report this job' })).toHaveCount(0);

  const dev = await signedIn(browser, data.talent.email);
  await dev.goto(`/talent/${data.talent.slug}`);
  await expect(dev.getByRole('button', { name: 'Report this profile' })).toHaveCount(0);

  const client = await signedIn(browser, data.client.email);
  await client.goto(`/jobs/${data.job.slug}`);
  await expect(client.getByText(data.job.title).first()).toBeVisible();
  await expect(client.getByRole('button', { name: 'Report this job' })).toHaveCount(0);
});
