import { expect, test } from '@playwright/test';

import { admin, canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Project covers on the developer cards in Browse: the first photo of each project, so a client
 * sees the work before reading about it. The photo row is written directly (the upload itself is
 * covered by the editor's own tests); what is checked here is that Browse picks it up.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
  const db = admin();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const { data: item, error } = await db
    .from('portfolio_items')
    .insert({
      talent_id: data.talent.profileId,
      title: 'Checkout rebuild',
      description:
        'Moved a homegrown subscription checkout onto Stripe, keeping its history intact.',
      sort_order: 99,
    })
    .select('id')
    .single();
  if (error) throw error;
  const { error: mediaError } = await db.from('item_media').insert({
    item_id: item.id,
    url: `${base}/storage/v1/object/public/project-media/${data.talent.userId}/cover.png`,
    alt_text: 'The new checkout, showing the saved-card step',
    sort_order: 0,
  });
  if (mediaError) throw mediaError;
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

test("a developer's project cover shows on their Browse card", async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(data.client.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });

  // Newest profiles first, so the one just seeded is on the first page.
  await page.goto('/browse?type=developers');
  const card = page.locator('article', {
    has: page.locator(`a[href="/talent/${data.talent.slug}"]`),
  });
  await expect(card).toBeVisible();
  await expect(
    card.getByRole('list', { name: 'Project photos' }).getByRole('img', {
      name: 'The new checkout, showing the saved-card step',
    }),
  ).toBeAttached();
});
