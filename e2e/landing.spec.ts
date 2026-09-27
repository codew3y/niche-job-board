import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The front door, for both kinds of visitor.
 *
 * Written because the landing page ignored the session entirely: a signed-in user clicking
 * the logo landed on "Get started", as though the product had forgotten them. A page that
 * only works for strangers is a page nobody tested while signed in.
 */

test.describe('signed out', () => {
  test('offers signup and browsing, and says there is no bar to clear', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /browse without signing up/i })).toBeVisible();
    // ADR-008 on the front page rather than discovered after signing up.
    await expect(page.getByText(/nothing to qualify for/i)).toBeVisible();
  });

  test('CARRIES NO PLACEHOLDER COPY — it shipped as a Phase 2 skeleton for weeks', async ({
    page,
  }) => {
    await page.goto('/');
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('walking skeleton');
    expect(body).not.toContain('phase 2');
    // The positioning ADR-008 removed.
    expect(body).not.toContain('is the profile');
  });
});

test.describe('signed in', () => {
  test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create an account');

  let data: Seeded;
  test.beforeAll(async () => {
    data = await seed();
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test('THE LANDING PAGE OFFERS THE DASHBOARD, not a signup button', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    // Asserts the destination, not merely that something happened: signing in with a role
    // must land on the dashboard directly rather than bouncing through /select-role.
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });

    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /continue as|go to your dashboard/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: /^get started$/i })).toHaveCount(0);
  });

  test('THE LOGO INSIDE THE APP GOES TO THE DASHBOARD, not to marketing', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto('/dashboard/talent/applications');
    await page.getByRole('link', { name: 'TechSelect' }).first().click();
    await expect(page).toHaveURL(/\/dashboard\//);
  });
});
