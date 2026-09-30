import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The front door: a full-screen video, the wordmark, one line, and the login container. Nothing
 * else — and never for someone who is signed in.
 */

test.describe('signed out', () => {
  test('shows the wordmark, a tagline and the login container — and nothing else', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /techselect/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign up' })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();

    // No navbar, no browse links, no dashboard content.
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /^(jobs|developers|browse)/i })).toHaveCount(0);
  });

  test('the background is a muted, non-looping slideshow with posters', async ({ page }) => {
    await page.goto('/');
    // Mounted after idle, and only when motion is allowed (Playwright's default allows it).
    const videos = page.locator('video');
    await expect(videos.first()).toBeAttached({ timeout: 10_000 });
    expect(await videos.count()).toBeGreaterThanOrEqual(2);
    for (const video of await videos.all()) {
      await expect(video).toHaveJSProperty('muted', true);
      await expect(video).toHaveJSProperty('loop', false);
      await expect(video).toHaveAttribute('poster', /\/videos\/.+-poster\.jpg$/);
    }
  });

  test('the clips are served, not redirected to the login', async ({ request }) => {
    // The proxy matcher once skipped images but not video, so every clip 307'd to "/".
    for (const path of ['/videos/code.mp4', '/videos/code.webm', '/videos/code-poster.jpg']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(200);
    }
  });

  test('the Sign up tab switches the form to account creation', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Sign up' }).click();
    await expect(page.getByLabel(/your name/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('a protected page sends a signed-out visitor to the front door, keeping the target', async ({
    page,
  }) => {
    await page.goto('/browse');
    await expect(page).toHaveURL(/\/\?next=%2Fbrowse$/);
    await expect(page.getByRole('tab', { name: 'Log in' })).toBeVisible();
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

  async function signIn(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
  }

  test('VISITING / REDIRECTS TO THE DASHBOARD — the landing page is never shown', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/talent$/);
  });

  test('THE LOGO NEVER LANDS A SIGNED-IN USER ON /', async ({ page }) => {
    await signIn(page);
    for (const path of ['/dashboard/talent/applications', '/browse', `/jobs/${data.job.slug}`]) {
      await page.goto(path);
      const logo = page.getByRole('link', { name: /techselect/i }).first();
      await expect(logo, `logo on ${path}`).toHaveAttribute('href', '/dashboard');
      await logo.click();
      await expect(page).toHaveURL(/\/dashboard\//);
    }
  });

  test('LOGGING OUT RETURNS TO THE FRONT DOOR', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /profile menu/i }).click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('tab', { name: 'Log in' })).toBeVisible();
  });
});
