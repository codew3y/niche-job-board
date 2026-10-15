import { expect, test, type Page } from '@playwright/test';

import { admin, canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * GitHub and LinkedIn as connected accounts (migration 0021).
 *
 * The OAuth round trip itself needs a real GitHub/LinkedIn login, so it is not driven here; the
 * database half (nothing can fake a connection) is pinned in backend/src/db/connected-accounts.test.ts.
 * These tests pin what a person sees: Connect buttons instead of typed fields, the portfolio
 * placeholder, and a public profile that shows a GitHub link only once it is connected.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
}

test('the profile editor offers Connect buttons, not GitHub or LinkedIn text fields', async ({
  page,
}) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile');

  await expect(page.getByLabel('Portfolio site')).toHaveAttribute('placeholder', 'Portfolio Link');

  for (const name of ['Connect GitHub', 'Connect LinkedIn']) {
    const button = page.getByRole('button', { name });
    await expect(button).toBeVisible();
    // The brand icon sits inside the button.
    await expect(button.locator('svg')).toHaveCount(1);
  }
  await expect(page.getByLabel(/^GitHub$/)).toHaveCount(0);
  await expect(page.getByLabel(/LinkedIn profile link/)).toHaveCount(0);
});

test('the public profile shows a GitHub link only once the account is connected', async ({
  page,
}) => {
  const db = admin();
  // A typed address from before connected accounts existed: stored, but not shown.
  await db
    .from('talent_profiles')
    .update({ github_url: 'https://github.com/someone-else', github_connected_at: null })
    .eq('id', data.talent.profileId);
  await page.goto(`/talent/${data.talent.slug}`);
  await expect(page.getByRole('link', { name: /GitHub/ })).toHaveCount(0);

  // Connected (what sync_connected_accounts writes after a real GitHub sign-in).
  await db
    .from('talent_profiles')
    .update({
      github_url: `https://github.com/e2e-${data.runId}`,
      github_connected_at: new Date().toISOString(),
    })
    .eq('id', data.talent.profileId);
  await page.goto(`/talent/${data.talent.slug}`);
  const link = page.getByRole('link', { name: /GitHub.*Connected/ });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', `https://github.com/e2e-${data.runId}`);
});
