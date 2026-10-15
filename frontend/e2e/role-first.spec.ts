import { expect, test } from '@playwright/test';

/**
 * The standalone signup page still accepts a role HINT (`?role=talent|client`).
 *
 * The landing page no longer asks which side you are on — it is a plain login container now —
 * but a `?role=` link from elsewhere still addresses the right audience and carries the hint
 * through email confirmation into onboarding.
 */

test('?role=talent addresses developers', async ({ page }) => {
  await page.goto('/signup?role=talent');
  await expect(page.getByRole('heading', { name: /find work/i })).toBeVisible();
});

test('?role=client addresses clients', async ({ page }) => {
  await page.goto('/signup?role=client');
  await expect(page.getByRole('heading', { name: /hire developers/i })).toBeVisible();
});

test('THE CHOICE IS CARRIED INTO THE FORM, so it survives to onboarding', async ({ page }) => {
  await page.goto('/signup?role=client');
  // A hidden field rather than a cookie: it has to survive a round trip through an email
  // confirmation link, where the browser context is gone.
  await expect(page.locator('input[name="intent"][value="client"]')).toBeAttached();
});

test('signup without a role still works and stays neutral', async ({ page }) => {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible();
  await expect(page.locator('input[name="intent"]')).toHaveCount(0);
});
