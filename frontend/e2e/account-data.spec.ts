import { expect, test, type Browser, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Promises the site makes (gap analysis #2):
 *   - "Developers can turn messages off entirely" (terms): the switch exists, and a client sees
 *     why there is no Message button;
 *   - "a copy of your data" (privacy): Download my data returns everything that is yours, and
 *     nothing that is not (no derived vectors, no applicant's cover note in a client's export).
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

test('a developer can turn new messages off, and a client sees why there is no button', async ({
  browser,
}) => {
  const dev = await signedIn(browser, data.talent.email);
  const client = await signedIn(browser, data.client.email);

  await client.goto(`/talent/${data.talent.slug}`);
  await expect(client.getByRole('button', { name: 'Message this developer' })).toBeVisible();

  await dev.goto('/dashboard/talent/profile');
  await dev.getByRole('button', { name: 'Turn off messages' }).click();
  await expect(dev.getByText('Messages off')).toBeVisible();

  await client.reload();
  await expect(client.getByRole('button', { name: 'Message this developer' })).toHaveCount(0);
  await expect(client.getByText('Not taking new messages right now.')).toBeVisible();

  await dev.getByRole('button', { name: 'Turn on messages' }).click();
  await expect(dev.getByText('Messages on')).toBeVisible();
  await client.reload();
  await expect(client.getByRole('button', { name: 'Message this developer' })).toBeVisible();
});

async function download(page: Page) {
  await page.goto('/dashboard/settings/account');
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download my data' }).click(),
  ]);
  expect(file.suggestedFilename()).toMatch(/^techselect-data-\d{4}-\d{2}-\d{2}\.json$/);
  const text = await (
    await file.createReadStream()
  )
    .toArray()
    .then((chunks) => Buffer.concat(chunks).toString('utf8'));
  return { text, json: JSON.parse(text) };
}

test("a developer's export holds their account and profile, and no derived data", async ({
  browser,
}) => {
  const dev = await signedIn(browser, data.talent.email);
  const { text, json } = await download(dev);
  expect(json.account.email).toBe(data.talent.email);
  expect(json.developer.profile.slug).toBe(data.talent.slug);
  expect(Array.isArray(json.conversations)).toBe(true);
  // Search and matching vectors are machinery, not anyone's data.
  expect(text).not.toMatch(/"embedding"|"search_vector"/);
});

test("a client's export holds their jobs, with received applications as status only", async ({
  browser,
}) => {
  const client = await signedIn(browser, data.client.email);
  const { json } = await download(client);
  expect(json.account.email).toBe(data.client.email);
  const job = json.client.jobs_posted.find((j: { slug: string }) => j.slug === data.job.slug);
  expect(job).toBeTruthy();
  for (const application of job.applications) {
    // An applicant's cover note is theirs, not the client's.
    expect(application).not.toHaveProperty('cover_note');
  }
});

test('the export is for signed-in people only', async ({ request }) => {
  const res = await request.get('/dashboard/settings/account/export', { maxRedirects: 0 });
  expect([307, 401]).toContain(res.status());
});
