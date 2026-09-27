import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The navigation names intentions, not features.
 *
 * Owner request, modelled on Upwork: Home, Search, Jobs, Messages, Profile — the same five
 * for both roles, each pointing at whatever it means for that role. The previous nav named
 * features ("Matches", "Applications", "Saved"), which required already knowing the product
 * in order to navigate it.
 *
 * These tests also pin the two items deliberately ABSENT. Contracts and Finances are on
 * Upwork and not here, because this product handles no agreements and no money — the terms
 * page says so — and a nav item leading to an explanation of its own non-existence is worse
 * than no item.
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

/**
 * Label AND destination, per role.
 *
 * Asserting labels alone proved nothing: both roles use the same five words, so this file
 * passed while the "client" fixture was being served the DEVELOPER shell — Home pointing at
 * /dashboard/talent, Profile at /dashboard/talent/profile. The href is the only part of a nav
 * item that differs between roles, so the href is the part worth asserting.
 */
const EXPECTED = {
  talent: [
    ['Home', '/dashboard/talent'],
    ['Search', '/jobs'],
    ['Jobs', '/dashboard/talent/applications'],
    ['Messages', '/dashboard/messages'],
    ['Profile', '/dashboard/talent/profile'],
  ],
  client: [
    ['Home', '/dashboard/client'],
    ['Search', '/talent'],
    ['Jobs', '/dashboard/client/jobs'],
    ['Messages', '/dashboard/messages'],
    ['Profile', '/dashboard/client/profile'],
  ],
} as const;

for (const [role, emailKey] of [
  ['developer', 'talent'],
  ['client', 'client'],
] as const) {
  test(`a ${role} sees all five destinations, pointing at their own side`, async ({ page }) => {
    await signIn(page, data[emailKey].email);
    const nav = page.getByRole('navigation', { name: 'Main' }).first();
    for (const [label, href] of EXPECTED[emailKey]) {
      const link = nav.getByRole('link', { name: label, exact: true });
      await expect(link).toBeVisible();
      await expect(link, `${role}'s "${label}" must point at ${href}`).toHaveAttribute(
        'href',
        href,
      );
    }
  });

  test(`a ${role} sees no Contracts or Finances`, async ({ page }) => {
    // Absent on purpose, and asserted so nobody adds a dead link later.
    await signIn(page, data[emailKey].email);
    await expect(page.getByRole('link', { name: /contracts/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /finances/i })).toHaveCount(0);
  });

  test(`EVERY ${role} NAV DESTINATION RESOLVES — no link points at a 404`, async ({ page }) => {
    await signIn(page, data[emailKey].email);
    const nav = page.getByRole('navigation', { name: 'Main' }).first();
    const hrefs = await nav
      .locator('a')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
      );
    expect(hrefs.length).toBeGreaterThanOrEqual(5);
    for (const href of hrefs) {
      const response = await page.goto(href as string);
      expect(response?.status(), `${href} returned ${response?.status()}`).toBeLessThan(400);
    }
  });
}

test('a client can edit the company name shown on every job they post', async ({ page }) => {
  // This page did not exist: the name was set once during onboarding and never again, while
  // appearing on every job card and public job page.
  await signIn(page, data.client.email);
  await page.goto('/dashboard/client/profile');
  await expect(page.getByLabel(/company name/i)).toBeVisible();

  const updated = `Renamed Co ${data.runId}`;
  await page.getByLabel(/company name/i).fill(updated);
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect(page.getByText(/^saved\.$/i)).toBeVisible({ timeout: 15_000 });

  await page.reload();
  await expect(page.getByLabel(/company name/i)).toHaveValue(updated);
});

test('matches and saved stay reachable after leaving the nav', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent');
  const quick = page.getByRole('navigation', { name: 'Quick links' });
  await expect(quick.getByRole('link', { name: /matches/i })).toBeVisible();
  await expect(quick.getByRole('link', { name: /saved/i })).toBeVisible();
});
