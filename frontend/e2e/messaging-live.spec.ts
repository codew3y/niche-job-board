import { expect, test, type Browser, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Messages that reach people (gap analysis #1).
 *
 * Two people in two browsers: a client writes, the developer sees it as unread; opening the
 * conversation marks it read with no button to press; and with the conversation open, a reply
 * from the other side appears without a reload. (The email for a new message is checked against
 * the database rule in its own script; mail delivery itself is not observable from a browser.)
 */

test.skip(!canSeed, 'needs SUPABASE_SERVICE_ROLE_KEY to create accounts');

let data: Seeded;
test.beforeAll(async () => {
  data = await seed();
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

test('a conversation is marked read by opening it, and replies arrive without a reload', async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const client = await signedIn(browser, data.client.email);
  const dev = await signedIn(browser, data.talent.email);

  // The client starts a conversation from the developer's profile.
  await client.goto(`/talent/${data.talent.slug}`);
  await client.getByRole('button', { name: 'Message this developer' }).click();
  await client
    .getByRole('dialog')
    .getByLabel('Message', { exact: true })
    .fill('Hello! We have a Stripe migration that fits your projects. Free for a call this week?');
  await client.getByRole('button', { name: 'Send message' }).click();
  await client.waitForURL(/\/dashboard\/messages\/[0-9a-f-]{36}$/);

  // The developer sees it as unread in the inbox. Scoped to <main>: the nav's Messages badge
  // carries the same screen-reader text.
  await dev.goto('/dashboard/messages');
  await expect(dev.getByRole('main').getByText('unread messages')).toHaveCount(1);

  // Opening the conversation marks it read: no "Mark as read" button any more.
  await dev
    .getByText(/Stripe migration that fits your projects/)
    .first()
    .click();
  await dev.waitForURL(/\/dashboard\/messages\/[0-9a-f-]{36}$/);
  await expect(dev.getByRole('button', { name: /mark as read/i })).toHaveCount(0);
  await expect
    .poll(
      async () => {
        await dev.goto('/dashboard/messages');
        return dev.getByRole('main').getByText('unread messages').count();
      },
      { timeout: 15_000 },
    )
    .toBe(0);

  // With the conversation open on the developer's side, the client's next message appears
  // without the developer reloading.
  await dev
    .getByText(/Stripe migration that fits your projects/)
    .first()
    .click();
  await dev.waitForURL(/\/dashboard\/messages\/[0-9a-f-]{36}$/);
  await client
    .getByLabel('Message', { exact: true })
    .fill('Following up: Thursday at 10:00 works for us.');
  await client.getByRole('button', { name: 'Send' }).click();
  await expect(client.getByText('Following up: Thursday at 10:00 works for us.')).toBeVisible();

  await expect(dev.getByText('Following up: Thursday at 10:00 works for us.')).toBeVisible({
    timeout: 20_000,
  });
});
