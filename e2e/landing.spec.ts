import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The public site: a static home page and four content pages, all under one header and footer,
 * with Log in / Sign up in the header rather than on the page.
 */

const SITE_PAGES = [
  ['/', /hire builders, not buzzwords/i],
  ['/for-freelancers', /get hired for what you have built/i],
  ['/for-clients', /find developers by what they have shipped/i],
  ['/how-it-works', /how techselect works/i],
  ['/about', /shipped work is the profile/i],
] as const;

test.describe('signed out', () => {
  for (const [path, heading] of SITE_PAGES) {
    test(`${path} renders its page inside the shared header and footer`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
      await expect(page.getByRole('link', { name: /techselect home/i }).first()).toHaveAttribute(
        'href',
        '/',
      );
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  }

  test('the header has the page links and Log in / Sign up', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    const site = page.getByRole('navigation', { name: 'Site' });
    for (const label of ['Home', 'For Freelancers', 'For Clients', 'How It Works', 'About']) {
      await expect(site.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login',
    );
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup',
    );
  });

  test('on a phone the header collapses into a menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('banner').getByRole('link', { name: 'Log in' })).toBeHidden();
    await page.getByRole('button', { name: 'Open menu' }).click();
    // Scoped to the header: the footer lists the same pages, so an unscoped "For Clients"
    // matches two links and strict mode refuses to pick one.
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'For Clients' })).toBeVisible();
  });

  test('the home page has a hero figure and no login form', async ({ page }) => {
    await page.goto('/');
    // The hero figure: a still photo, described for screen readers. No video, no caption.
    const photo = page.locator('figure img[src*="hero"]');
    await expect(photo).toBeVisible();
    await expect(photo).toHaveAttribute('alt', /developer/i);
    await expect(page.locator('figure video')).toHaveCount(0);
    await expect(page.locator('figure figcaption')).toHaveCount(0);
    // Log in lives in the header now, not in the page.
    await expect(page.getByLabel(/password/i)).toHaveCount(0);
  });

  test('the category grid links every card to a Browse filter', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Find freelancers for every type of work' }),
    ).toBeVisible();
    const cards = page.locator('a[href^="/browse?type=developers&category="]');
    await expect(cards).toHaveCount(10);
  });

  test('How It Works shows four illustrated steps with alt text', async ({ page }) => {
    await page.goto('/how-it-works');
    // By position, not by file path: the photos are static imports, served from hashed
    // /_next/static/media/ paths that no longer contain the folder name.
    const images = page.locator('main ol img');
    await expect(images).toHaveCount(4);
    for (const img of await images.all()) {
      await expect(img).toHaveAttribute('alt', /.{10,}/);
    }
  });

  test('a protected page sends a signed-out visitor to the login, keeping the target', async ({
    page,
  }) => {
    await page.goto('/browse');
    await expect(page).toHaveURL(/\/login\?next=%2Fbrowse$/);
  });

  test('CARRIES NO PLACEHOLDER COPY', async ({ page }) => {
    await page.goto('/');
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).not.toContain('lorem ipsum');
    expect(body).not.toContain('walking skeleton');
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

  async function signIn(page: Page) {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
  }

  test('VISITING / GOES TO THE DASHBOARD', async ({ page }) => {
    await signIn(page);
    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/talent$/);
  });

  test('the site header offers the dashboard, not Sign up', async ({ page }) => {
    await signIn(page);
    await page.goto('/about');
    await expect(
      page.getByRole('banner').getByRole('link', { name: /go to dashboard/i }),
    ).toHaveCount(1);
    await expect(page.getByRole('banner').getByRole('link', { name: 'Sign up' })).toHaveCount(0);
  });

  test('THE LOGO INSIDE THE APP NEVER LANDS A SIGNED-IN USER ON /', async ({ page }) => {
    await signIn(page);
    for (const path of ['/dashboard/talent/applications', '/browse', `/jobs/${data.job.slug}`]) {
      await page.goto(path);
      const logo = page.getByRole('link', { name: /techselect home/i }).first();
      await expect(logo, `logo on ${path}`).toHaveAttribute('href', '/dashboard');
    }
  });

  test('LOGGING OUT RETURNS TO THE HOME PAGE', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: /profile menu/i }).click();
    await page.getByRole('menuitem', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { level: 1, name: /hire builders, not buzzwords/i }),
    ).toBeVisible();
  });
});
