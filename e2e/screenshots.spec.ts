import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Regenerates the README screenshots. NOT part of the suite.
 *
 * Opt-in via CAPTURE_SCREENSHOTS=1, because this writes into the repository — a test that
 * modifies tracked files on every CI run is a test that makes every build dirty.
 *
 *   CAPTURE_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts
 *
 * Captured against the seeded fixture data, so the images show a populated product rather
 * than the empty states, and never real user content.
 */

test.describe(() => {
  test.skip(process.env.CAPTURE_SCREENSHOTS !== '1', 'set CAPTURE_SCREENSHOTS=1 to regenerate');
  test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

  let data: Seeded;
  test.beforeAll(async () => {
    data = await seed();
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test.use({ viewport: { width: 1280, height: 800 } });

  const shot = (name: string) => ({ path: `docs/screenshots/${name}.png`, fullPage: false });

  /**
   * Wait for the LIST, not the heading.
   *
   * Both browse pages stream their results inside Suspense, so the <h1> is visible while the
   * rows are still skeletons — which is exactly what the first run of this file captured.
   */
  test('landing, browse and a public profile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot(shot('01-landing'));

    // Browse is sign-in-only.
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });

    await page.goto('/browse?type=jobs');
    await expect(page.locator('a[href^="/jobs/"]').first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot(shot('02-browse-jobs'));

    await page.goto('/browse?type=developers');
    await expect(page.locator('a[href^="/talent/"]').first()).toBeVisible({ timeout: 20_000 });
    await page.screenshot(shot('03-browse-talent'));

    const href = await page.locator('a[href^="/talent/"]').first().getAttribute('href');
    await page.goto(href!);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.screenshot(shot('04-talent-profile'));
  });

  test('a signed-in dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
    await expect(page.getByRole('navigation', { name: 'Main' }).first()).toBeVisible();
    await page.screenshot(shot('05-dashboard'));
  });
});
