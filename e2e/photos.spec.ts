import { expect, test, type Browser, type Page } from '@playwright/test';
import sharp from 'sharp';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Profile photos and company logos (gap analysis, urgent g and h): uploaded from the profile and
 * company pages, shown where the person or company appears, and removable.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
let png: Buffer;
test.beforeAll(async () => {
  data = await seed();
  png = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 50, b: 103 } },
  })
    .png()
    .toBuffer();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

async function signedIn(browser: Browser, email: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
  return page;
}

/** next/image rewrites the src through /_next/image; the original URL is in its `url` param. */
const ownImage = (userId: string) => new RegExp(`media%2F${userId}%2F`);

test('a developer adds a photo, it shows on their public profile, and they can remove it', async ({
  browser,
}) => {
  const dev = await signedIn(browser, data.talent.email);
  await dev.goto('/dashboard/talent/profile');
  await dev
    .getByLabel('Upload')
    .setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: png });
  await expect(dev.getByRole('button', { name: 'Remove' }).first()).toBeVisible({
    timeout: 20_000,
  });

  await dev.goto(`/talent/${data.talent.slug}`);
  await expect(dev.locator('header img').first()).toHaveAttribute(
    'src',
    ownImage(data.talent.userId),
  );

  await dev.goto('/dashboard/talent/profile');
  await dev.getByRole('button', { name: 'Remove' }).first().click();
  await expect(dev.getByLabel('Upload')).toBeAttached({ timeout: 15_000 });
  await dev.goto(`/talent/${data.talent.slug}`);
  await expect(dev.locator('header img')).toHaveCount(0);
});

test('a client adds a logo and it shows on their company page and jobs', async ({ browser }) => {
  const client = await signedIn(browser, data.client.email);
  await client.goto('/dashboard/client/profile');
  await client
    .getByLabel('Upload')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: png });
  await expect(client.getByRole('button', { name: 'Remove' }).first()).toBeVisible({
    timeout: 20_000,
  });

  await client.goto(`/company/${data.client.profileId}`);
  await expect(client.locator('header img').first()).toHaveAttribute(
    'src',
    ownImage(data.client.userId),
  );
  await client.goto(`/jobs/${data.job.slug}`);
  await expect(client.locator('header img').first()).toHaveAttribute(
    'src',
    ownImage(data.client.userId),
  );
});
