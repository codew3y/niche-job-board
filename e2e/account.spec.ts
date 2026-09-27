import { expect, test, type Page } from '@playwright/test';

import { admin, canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Deleting an account, through the product.
 *
 * /privacy has said since publication that you can "delete your account from settings at any
 * time". There was no settings page, no action and no route — the promise was untrue, and the
 * database path underneath it returned a 500 besides (migration 0019).
 *
 * lib/db/deletion.test.ts proves the cascade: own data removed, shared conversations kept with
 * this side tombstoned. What it cannot prove is that a person can ASK for any of it. That is
 * what this file is for, so it asserts the journey and the aftermath rather than the rows.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeEach(async () => {
  // Per test, not per file: these tests delete the account they sign in with.
  data = await seed();
});
test.afterEach(async () => {
  if (data) await teardown(data);
});

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
}

const stillExists = async (userId: string) =>
  admin()
    .auth.admin.getUserById(userId)
    .then(({ data: d, error }) => Boolean(d?.user) && !error);

test('settings is reachable from the profile — /privacy points people there', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile');
  await page.getByRole('link', { name: /^settings$/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/settings$/);
  // By destination, not by words: both cards mention "account" — Roles says "One account,
  // both sides" — so a name-based locator matches two links and proves nothing about either.
  await expect(page.locator('a[href="/dashboard/settings/account"]')).toBeVisible();
});

test('the wrong email does not delete the account', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/settings/account');
  await page.getByRole('button', { name: /delete my account$/i }).click();

  await page.getByLabel(/type your email address/i).fill('someone.else@example.test');
  await page.getByRole('button', { name: /delete my account permanently/i }).click();

  await expect(page.getByText(/not the email address on this account/i)).toBeVisible({
    timeout: 15_000,
  });
  // The assertion that matters is not the message — it is that nothing happened.
  expect(await stillExists(data.talent.userId)).toBe(true);
});

test('A PERSON CAN DELETE THEIR OWN ACCOUNT, and it is actually gone', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/settings/account');

  // Behind a button on purpose: the input should not be sitting there to be typed into.
  await expect(page.getByLabel(/type your email address/i)).toHaveCount(0);
  await page.getByRole('button', { name: /delete my account$/i }).click();

  await page.getByLabel(/type your email address/i).fill(data.talent.email);
  await page.getByRole('button', { name: /delete my account permanently/i }).click();

  // Told that it happened. Being signed out onto a marketing page reads as a failure.
  await page.waitForURL(/\/\?deleted=1$/, { timeout: 20_000 });
  await expect(page.getByText(/your account has been deleted/i)).toBeVisible();

  expect(await stillExists(data.talent.userId)).toBe(false);

  // Signed out, not merely redirected.
  await page.goto('/dashboard/talent');
  await expect(page).toHaveURL(/\/login/);

  // And the credentials no longer work, which is the difference between deleted and hidden.
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(data.talent.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/dashboard\//, { timeout: 10_000 });
});

test('SOMEONE MID-ONBOARDING CAN STILL LEAVE', async ({ page }) => {
  // An account that signed up and never chose a role. It has an auth row and an email address
  // we hold, so the erasure right applies in full — but (dashboard)/layout.tsx redirects
  // anyone without a role profile to /select-role, which put the delete page behind the very
  // step they abandoned. The route policy allowed /dashboard/settings pre-role the whole time;
  // the layout above it quietly did not.
  const db = admin();
  const email = `e2e-halfway-${data.runId}@example.test`;
  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created?.user) throw new Error(`could not create fixture: ${error?.message}`);
  const userId = created.user.id;
  await db.from('user_profiles').upsert({ user_id: userId, display_name: 'Halfway' });

  try {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    // No role, so no dashboard — they land on the role chooser, not a dashboard.
    await page.waitForURL(/\/select-role/, { timeout: 20_000 });

    await page.goto('/dashboard/settings/account');
    await expect(page).toHaveURL(/\/dashboard\/settings\/account$/);

    await page.getByRole('button', { name: /delete my account$/i }).click();
    await page.getByLabel(/type your email address/i).fill(email);
    await page.getByRole('button', { name: /delete my account permanently/i }).click();
    await page.waitForURL(/\/\?deleted=1$/, { timeout: 20_000 });

    expect(await stillExists(userId)).toBe(false);
  } finally {
    await db.auth.admin.deleteUser(userId).catch(() => {});
  }
});

test('the other side of the account survives — the client is untouched', async ({ page }) => {
  // Deleting one account must not take anyone else's with it. The job the client posted is
  // the visible proof, and it is public.
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/settings/account');
  await page.getByRole('button', { name: /delete my account$/i }).click();
  await page.getByLabel(/type your email address/i).fill(data.talent.email);
  await page.getByRole('button', { name: /delete my account permanently/i }).click();
  await page.waitForURL(/\/\?deleted=1$/, { timeout: 20_000 });

  expect(await stillExists(data.client.userId)).toBe(true);
  const response = await page.goto(`/jobs/${data.job.slug}`);
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole('heading', { name: data.job.title })).toBeVisible();
});
