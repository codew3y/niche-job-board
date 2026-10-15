import { expect, test, type Browser, type Page } from '@playwright/test';

import { admin, canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The reports queue (gap analysis, urgent e). Admins are the accounts in ADMIN_EMAILS
 * (playwright.config.ts sets e2e-admin@example.test for the test server); anyone else gets a 404.
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

const ADMIN_EMAIL = 'e2e-admin@example.test';
let data: Seeded;
let adminUserId = '';

test.beforeAll(async () => {
  data = await seed();
  const db = admin();
  // A fresh admin account with a client role, so the app shell lets it in.
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const old = list?.users.find((u) => u.email === ADMIN_EMAIL);
  if (old) await db.auth.admin.deleteUser(old.id);
  const { data: created, error } = await db.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(`admin user: ${error?.message}`);
  adminUserId = created.user.id;
  await db.from('user_profiles').upsert({ user_id: adminUserId, display_name: 'E2E Admin' });
  await db.from('client_profiles').insert({ user_id: adminUserId, company_name: 'E2E Admin Co' });
  await db.from('user_profiles').update({ active_role: 'client' }).eq('user_id', adminUserId);

  await db.from('reports').insert({
    reporter_id: data.talent.userId,
    subject_type: 'job',
    subject_id: data.job.id,
    reason: 'E2E: this job asks applicants to pay a fee.',
  });
});

test.afterAll(async () => {
  const db = admin();
  await db
    .from('reports')
    .delete()
    .eq('subject_id', data?.job.id ?? '');
  if (adminUserId) await db.auth.admin.deleteUser(adminUserId);
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

test('an admin closes a reported job from the queue, and the report is resolved', async ({
  browser,
}) => {
  const page = await signedIn(browser, ADMIN_EMAIL);
  await page.getByRole('button', { name: /profile menu/i }).click();
  await expect(page.getByRole('menuitem', { name: 'Reports' })).toHaveAttribute(
    'href',
    '/dashboard/admin',
  );
  await page.goto('/dashboard/admin');

  const card = page.getByRole('listitem').filter({ hasText: 'E2E: this job asks applicants' });
  await expect(card).toBeVisible();
  await expect(card.getByRole('link', { name: data.job.title })).toBeVisible();
  await card.getByRole('button', { name: 'Close job and resolve' }).click();

  const resolved = page.getByRole('region', { name: 'Recently resolved' });
  await expect(resolved.getByText('E2E: this job asks applicants')).toBeVisible({
    timeout: 15_000,
  });

  const { data: job } = await admin().from('jobs').select('status').eq('id', data.job.id).single();
  expect(job?.status).toBe('closed');
});

test('anyone else gets a 404, and no Reports menu item', async ({ browser }) => {
  const page = await signedIn(browser, data.talent.email);
  const res = await page.goto('/dashboard/admin');
  expect(res?.status()).toBe(404);
  await page.goto('/dashboard/talent');
  await page.getByRole('button', { name: /profile menu/i }).click();
  await expect(page.getByRole('menuitem', { name: 'Reports' })).toHaveCount(0);
});
