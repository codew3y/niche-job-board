import { expect, test } from '@playwright/test';

import { canSeed, seed, teardown, type Seeded } from './fixtures';

/** Live board counts on the home page, and the share cards behind job and profile links. */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
});
test.afterAll(async () => {
  if (data) await teardown(data);
});

test('the home page counts the open briefs and listed developers', async ({ page }) => {
  await page.goto('/');
  // The seed publishes one job and one profile, so both figures are at least 1.
  const briefs = page.getByRole('link', { name: /^open briefs?$/ });
  await expect(briefs).toHaveAttribute('href', '/browse?type=jobs');
  await expect(page.getByRole('link', { name: /^developers? listed$/ })).toBeVisible();
});

for (const kind of ['job', 'profile'] as const) {
  test(`a ${kind} link carries a generated share image`, async ({ page, request }) => {
    await page.goto(kind === 'job' ? `/jobs/${data.job.slug}` : `/talent/${data.talent.slug}`);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og).toMatch(/opengraph-image/);
    const res = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
  });
}
