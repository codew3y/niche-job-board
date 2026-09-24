import { expect, test } from '@playwright/test';

/**
 * Every public route must be reachable while signed out — through the REAL middleware.
 *
 * This exists because unit tests did not catch a live bug. /privacy and /terms were added to
 * route-policy.ts and its tests passed, while lib/supabase/middleware.ts kept a second copy
 * of the public-route list that nobody updated. Production redirected both to /login for
 * eighteen hours, with Google's OAuth consent screen linking straight at them.
 *
 * The unit tests were not wrong — they were testing a function the running system did not
 * call. The two implementations have since been collapsed into one, and this suite is the
 * guard that the collapse holds: it drives a real build through a real request, so a route
 * that is public in theory and gated in practice fails here.
 *
 * The responsive suite already visits some of these and did NOT catch it, because a redirect
 * to /login still renders a page with no horizontal overflow. Asserting the landing URL is
 * what makes the difference.
 */

import { PUBLIC_ROUTES } from '../lib/supabase/route-policy';

/**
 * Derived from the real allow-list, not a copy of it.
 *
 * A hand-kept list here would drift exactly the way the middleware's copy drifted — and it
 * did: /robots.txt and /sitemap.xml were added as public routes and immediately redirected to
 * /login, because nothing tested them. Deriving means a new public route is covered the
 * moment it is declared.
 *
 * /auth/* is excluded because those URLs need a one-time token and answer with a redirect by
 * design; asserting they do not redirect would be asserting they are broken.
 */
const PUBLIC = PUBLIC_ROUTES.filter((p) => !p.startsWith('/auth') && p !== '/api/health');

test.describe('signed out', () => {
  for (const path of PUBLIC) {
    test(`${path} is reachable without a session`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} returned ${response?.status()}`).toBeLessThan(400);
      // The assertion that matters: no redirect to /login. A 200 is not enough, because the
      // login page is itself a 200.
      expect(page.url(), `${path} redirected to ${page.url()}`).not.toContain('/login?next=');
    });
  }

  test('/api/health answers without a session', async ({ page }) => {
    const response = await page.goto('/api/health');
    expect(response?.status()).toBe(200);
    const body = await page.evaluate(() => JSON.parse(document.body.innerText));
    expect(body.status).toBe('ok');
  });

  test('the warm endpoint is reachable but refuses without the secret', async ({ request }) => {
    // Reachable so a scheduled caller gets a real answer rather than a redirect to an HTML
    // login page — the same trap /api/health is public to avoid. Refusing is its own job.
    const response = await request.post('/api/match/warm');
    expect([403, 503]).toContain(response.status());
  });

  test('A PRIVATE ROUTE STILL REDIRECTS — the list has not gone open', async ({ page }) => {
    // The counterweight: proving public routes are public means nothing if everything is.
    await page.goto('/dashboard/talent');
    expect(page.url()).toContain('/login?next=');
  });
});
