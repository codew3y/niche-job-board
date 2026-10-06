import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Page behaviour the owner reported (October 2026): the sign-in photo and form scroll as one, the
 * profile menu does not freeze the page behind it, and currencies are searchable.
 */

test('sign in: the photo is as tall as the form column, so the two scroll together', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await page.goto('/login');
  const photo = page.getByRole('main').locator('figure');
  const form = page.getByRole('main').locator('> div').first();
  // Measured once the form's entrance animation (a short rise) has settled.
  await expect
    .poll(async () => {
      const [p, f] = await Promise.all([photo.boundingBox(), form.boundingBox()]);
      return p && f ? Math.max(Math.abs(p.y - f.y), Math.abs(p.height - f.height)) : Infinity;
    })
    .toBeLessThan(2);
  expect(await photo.evaluate((el) => getComputedStyle(el).position)).not.toBe('sticky');
});

test.describe('signed in', () => {
  test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

  let data: Seeded;
  test.beforeAll(async () => {
    data = await seed();
  });
  test.afterAll(async () => {
    if (data) await teardown(data);
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.talent.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
  });

  test('the page still scrolls while the profile menu is open', async ({ page }) => {
    await page.goto('/dashboard/talent/profile');
    await page.getByRole('button', { name: /^Profile menu/ }).click();
    await expect(page.getByRole('menu')).toBeVisible();
    // A modal menu locks scrolling with overflow: hidden on <html> or <body>.
    const locked = await page.evaluate(() =>
      [document.documentElement, document.body].some(
        (el) =>
          getComputedStyle(el).overflow === 'hidden' || getComputedStyle(el).overflowY === 'hidden',
      ),
    );
    expect(locked).toBe(false);
  });

  test('the rate currency is searchable by name', async ({ page }) => {
    await page.goto('/dashboard/talent/profile');
    const currency = page.getByRole('combobox', { name: 'Currency' });
    await currency.fill('peso');
    await expect(page.getByRole('option', { name: /PHP/ })).toBeVisible();
    await page.getByRole('option', { name: /PHP/ }).click();
    await expect(currency).toHaveValue('PHP · Philippine Peso');
  });
});
