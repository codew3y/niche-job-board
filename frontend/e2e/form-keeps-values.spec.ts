import { expect, test } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * A rejected form keeps what was typed (frontend/components/ui/form.tsx).
 *
 * React 19 clears a form after its action runs, including when the server refuses it, so one
 * wrong field used to wipe every other field. These submit one field wrong and check that
 * everything else — text, a textarea, a select, a radio choice — is still there, and that the
 * wrong field keeps its value too, so it can be corrected rather than retyped.
 */

test('sign-up: a too-short password keeps the name and email', async ({ page }) => {
  await page.goto('/signup');
  await page.getByLabel('Your name').fill('Maria Santos');
  await page.getByLabel('Email').fill('maria.keeps@example.test');
  await page.getByLabel('Password').fill('short');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByText(/12 characters/).first()).toBeVisible();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Maria Santos');
  await expect(page.getByLabel('Email')).toHaveValue('maria.keeps@example.test');
  await expect(page.getByLabel('Password')).toHaveValue('short');
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

  test('new job: a too-short description keeps every other field', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(data.client.email);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });

    await page.goto('/dashboard/client/jobs/new');
    await page.getByLabel('Title').fill('Move our billing onto Stripe');
    await page.getByLabel('What needs building?').fill('Too short.');
    await page.getByLabel('Requirements').fill('Has shipped a Stripe migration before.');
    await page.getByRole('radio', { name: 'Hourly' }).check({ force: true });
    await page.getByLabel('Budget from').fill('40');
    await page.getByLabel('Budget to').fill('60');
    // The searchable currency picker: type, then choose from the list.
    const currency = page.getByRole('combobox', { name: 'Currency' });
    await currency.fill('swiss');
    await page.getByRole('option', { name: /CHF/ }).click();
    await page.getByRole('button', { name: /save draft/i }).click();

    // Refused by the server: no skill was added (the description is short too).
    await expect(page.getByText('Add at least one skill, or nobody can be matched.')).toBeVisible();
    await expect(page).toHaveURL(/\/jobs\/new$/);
    await expect(page.getByLabel('Title')).toHaveValue('Move our billing onto Stripe');
    await expect(page.getByLabel('What needs building?')).toHaveValue('Too short.');
    await expect(page.getByLabel('Requirements')).toHaveValue(
      'Has shipped a Stripe migration before.',
    );
    await expect(page.getByRole('radio', { name: 'Hourly' })).toBeChecked();
    await expect(page.getByLabel('Budget from')).toHaveValue('40');
    await expect(page.getByLabel('Budget to')).toHaveValue('60');
    await expect(currency).toHaveValue('CHF · Swiss Franc');
  });
});
