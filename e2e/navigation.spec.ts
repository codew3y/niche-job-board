import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The sidebar: four destinations per role, one shared Browse, and the profile ONLY in the
 * profile menu at the foot of the sidebar.
 *
 * These tests also pin the items deliberately ABSENT: Profile as a nav item (it lives in the
 * menu), and Contracts / Finances — this product handles no agreements and no money.
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
    ['Browse', '/browse'],
    ['Applications', '/dashboard/talent/applications'],
    ['Messages', '/dashboard/messages'],
  ],
  client: [
    ['Home', '/dashboard/client'],
    ['Browse', '/browse'],
    ['My jobs', '/dashboard/client/jobs'],
    ['Messages', '/dashboard/messages'],
  ],
} as const;

for (const [role, emailKey] of [
  ['developer', 'talent'],
  ['client', 'client'],
] as const) {
  test(`a ${role} sees all four destinations, pointing at their own side`, async ({ page }) => {
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

  test(`a ${role} sees no Profile, Contracts or Finances in the nav`, async ({ page }) => {
    // Absent on purpose, and asserted so nobody adds one back.
    await signIn(page, data[emailKey].email);
    const nav = page.getByRole('navigation', { name: 'Main' }).first();
    await expect(nav.getByRole('link', { name: /profile/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /contracts/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /finances/i })).toHaveCount(0);
  });

  test(`a ${role}'s profile menu has View profile, Edit profile, Settings and Log out`, async ({
    page,
  }) => {
    await signIn(page, data[emailKey].email);
    await page.getByRole('button', { name: /profile menu/i }).click();
    for (const name of ['View profile', 'Edit profile', 'Settings', 'Log out']) {
      await expect(page.getByRole('menuitem', { name })).toBeVisible();
    }
    // The two items lead to two different pages: the public one and the editor. (They were
    // once the same page for a client, which read as a bug.)
    const view = await page.getByRole('menuitem', { name: 'View profile' }).getAttribute('href');
    const edit = await page.getByRole('menuitem', { name: 'Edit profile' }).getAttribute('href');
    expect(view?.split('#')[0]).not.toBe(edit?.split('#')[0]);
    if (emailKey === 'client') expect(view).toBe(`/company/${data.client.profileId}`);
    // Single-role fixture accounts: no switcher to offer.
    await expect(page.getByRole('menuitem', { name: /switch to/i })).toHaveCount(0);
  });

  test(`EVERY ${role} NAV DESTINATION RESOLVES — no link points at a 404`, async ({ page }) => {
    await signIn(page, data[emailKey].email);
    const nav = page.getByRole('navigation', { name: 'Main' }).first();
    const hrefs = await nav
      .locator('a')
      .evaluateAll((els) =>
        els.map((e) => (e as HTMLAnchorElement).getAttribute('href')).filter(Boolean),
      );
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
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

/**
 * THE ROLE BUG: Browse and the dashboard must agree about who is looking. Both now read
 * user_profiles.active_role; before, Browse inferred the role from which profiles existed.
 */
test('Browse renders the developer view for a developer', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/browse?type=jobs');
  // A developer saves jobs.
  await expect(page.getByRole('button', { name: /^save /i }).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.goto('/browse?type=developers');
  await expect(page.locator('a[href^="/talent/"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^save /i })).toHaveCount(0);
});

test('Browse renders the client view for a client', async ({ page }) => {
  await signIn(page, data.client.email);
  await page.goto('/browse?type=developers');
  // A client saves developers, never jobs.
  await expect(page.getByRole('button', { name: /^save /i }).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.goto('/browse?type=jobs');
  await expect(page.locator('a[href^="/jobs/"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /^save /i })).toHaveCount(0);
});

test('Browse has one page for both types, with the new copy', async ({ page }) => {
  await signIn(page, data.client.email);
  await page.goto('/browse');
  const show = page.getByRole('navigation', { name: 'Show' });
  for (const label of ['All', 'Jobs', 'Developers']) {
    await expect(show.getByRole('link', { name: label, exact: true })).toBeVisible();
  }
  await expect(
    page.getByText('Everyone who wants to be listed is listed. Judge them on what you see.'),
  ).toBeVisible();
  await expect(page.getByPlaceholder('Search by skill, title, or name…')).toBeVisible();
});

test('the old browse URLs land on Browse with the type set', async ({ page }) => {
  await signIn(page, data.client.email);
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/browse\?type=jobs/);
  await page.goto('/talent');
  await expect(page).toHaveURL(/\/browse\?type=developers/);
});
