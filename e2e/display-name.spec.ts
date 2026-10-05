import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/** Changing your name after signup (gap analysis, urgent i). */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

test('a name changed in settings shows in the profile menu, and a blank one is refused', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(data.talent.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });

  await page.goto('/dashboard/settings/account');
  const field = page.getByLabel('Your name');
  await field.fill(' ');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByText('At least 2 characters.')).toBeVisible();

  await field.fill('Maria Santos');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();

  await page.goto('/dashboard/talent');
  await expect(page.getByRole('button', { name: 'Profile menu: Maria Santos' })).toBeVisible();
});
