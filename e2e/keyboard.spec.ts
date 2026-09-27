import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Keyboard paths that automated a11y scanners cannot see.
 *
 * axe checks that controls HAVE names and focus styles; it cannot check that Tab goes somewhere
 * sensible. These were found by a scripted keyboard pass during the UI rebuild (DESIGN.md §6.3)
 * — the apply sheet let focus escape to the page behind it — and are pinned so they stay fixed.
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

test('the skip link is the first tab stop', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText(/skip to content/i);
});

test('A MODAL KEEPS FOCUS — Tab never escapes to the page behind it', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto(`/jobs/${data.job.slug}`);
  await page.getByRole('button', { name: /apply for this job/i }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Twice round the dialog in each direction: every stop must stay inside it.
  for (const key of ['Tab', 'Shift+Tab']) {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(key);
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role=dialog]')),
      );
      expect(inside, `${key} #${i + 1} left the dialog`).toBe(true);
    }
  }

  // Escape closes it and focus goes back to the control that opened it.
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator(':focus')).toHaveText(/apply for this job/i);
});

test('the account menu is operable from the keyboard', async ({ page }) => {
  await signIn(page, data.talent.email);
  const trigger = page.getByRole('button', { name: /^account:/i });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(trigger).toBeFocused();
});
