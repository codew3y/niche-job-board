import { expect, test } from '@playwright/test';

/**
 * The role is chosen BEFORE the account exists.
 *
 * Modelled on what Upwork does: ask "are you hiring or looking for work" on the way in, not
 * on the far side of a signup form. Someone deciding whether a product is for them should not
 * have to commit first and find out second.
 */

test('the landing page asks which side you are on', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /looking for work/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /hiring/i })).toBeVisible();
  // And browsing stays available without choosing anything at all.
  await expect(page.getByRole('link', { name: /browse without an account/i })).toBeVisible();
});

test('choosing "looking for work" reaches a signup page addressed to developers', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: /looking for work/i }).click();
  await expect(page).toHaveURL(/\/signup\?role=talent/);
  await expect(page.getByRole('heading', { name: /find work/i })).toBeVisible();
  // The hedge the old copy used — "you'll pick Talent or Client next" — is gone.
  await expect(page.getByText(/pick talent or client next/i)).toHaveCount(0);
});

test('choosing "hiring" reaches a signup page addressed to clients', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: /hiring/i }).click();
  await expect(page).toHaveURL(/\/signup\?role=client/);
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
