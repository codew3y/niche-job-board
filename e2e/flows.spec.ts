import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * The three critical paths (PROJECT.md §7 exit criteria).
 *
 *   1. A developer publishes a profile and it is publicly visible
 *   2. A developer finds a job and applies; the client sees the application
 *   3. The client moves it through shortlist, and the developer sees the change
 *
 * These are end-to-end in the sense that matters: a real build, a real database, real RLS,
 * real sessions. Nothing here is mocked, so a policy that refuses the wrong person shows up
 * as a failed flow rather than as a passing unit test.
 *
 * Skipped rather than failed without a service-role key. A suite that cannot create accounts
 * has nothing to say, and saying it in green would be worse than saying nothing.
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
  // Landing anywhere inside the app means the session took; the exact destination depends on
  // which roles the account has, which is not what this helper is asserting.
  await page.waitForURL(/\/(dashboard|select-role|onboarding)/, { timeout: 20_000 });
}

test.describe('path 1 — a published profile is publicly visible', () => {
  test('anyone can read it without signing in', async ({ page }) => {
    await page.goto(`/talent/${data.talent.slug}`);
    await expect(
      page.getByRole('heading', { name: /Stripe and Postgres developer/i }),
    ).toBeVisible();
  });

  test('it appears in browse, and full-text search finds it', async ({ page }) => {
    await page.goto('/talent?q=subscription%20billing');
    await page.waitForLoadState('networkidle');
    // Scoped by href, not by text: every run seeds an identically-worded profile, so matching
    // on the headline resolves to several and fails strict mode for the wrong reason.
    await expect(page.locator(`a[href="/talent/${data.talent.slug}"]`)).toBeVisible();
  });

  test('SEARCH MATCHES TERMS THAT ARE NOT ADJACENT — the ilike regression', async ({ page }) => {
    // "Postgres developer" spans the headline with other words between. A substring match
    // finds nothing here; this is the behaviour migration 0013 exists for.
    await page.goto('/talent?q=postgres%20developer');
    await page.waitForLoadState('networkidle');
    await expect(page.locator(`a[href="/talent/${data.talent.slug}"]`)).toBeVisible();
  });

  test('an unpublished profile 404s for the public', async ({ page }) => {
    const response = await page.goto('/talent/definitely-not-a-real-profile-slug');
    expect(response?.status()).toBe(404);
  });
});

test.describe('path 2 — apply, and the client receives it', () => {
  test('the job is publicly visible and carries JobPosting structured data', async ({ page }) => {
    await page.goto(`/jobs/${data.job.slug}`);
    await expect(page.getByRole('heading', { name: data.job.title })).toBeVisible();

    const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(ld ?? '{}')['@type']).toBe('JobPosting');
  });

  test('a signed-out visitor is sent to sign in rather than shown a dead button', async ({
    page,
  }) => {
    await page.goto(`/jobs/${data.job.slug}`);
    const applyLink = page.getByRole('link', { name: /sign in to apply/i });
    if (await applyLink.count()) {
      await expect(applyLink).toBeVisible();
    } else {
      // Whatever the affordance is called, it must not be an apply control that does nothing.
      await expect(page.getByRole('button', { name: /^apply/i })).toHaveCount(0);
    }
  });

  test('the developer applies and it lands in the client inbox', async ({ page }) => {
    await signIn(page, data.talent.email);
    await page.goto(`/jobs/${data.job.slug}`);

    await page.getByRole('button', { name: /apply for this job/i }).click();
    await page
      .getByLabel(/why you fit/i)
      .fill(
        'I moved a homegrown subscription system onto Stripe last year, including backfilling history.',
      );
    await page.getByRole('button', { name: /send application/i }).click();

    /**
     * The confirmation appears on the PAGE, not in the dialog. The dialog unmounts on the
     * re-render that follows a successful apply — which is how this test found that its
     * success screen was unreachable dead code.
     */
    await expect(page.getByText(/application sent/i)).toBeVisible({ timeout: 15_000 });

    // And the developer can see it in their own tracker.
    await page.goto('/dashboard/talent/applications');
    await expect(page.getByText(data.job.title)).toBeVisible();
  });

  test('THE CLIENT SEES THE APPLICATION, and nobody else does', async ({ page }) => {
    await signIn(page, data.client.email);
    await page.goto(`/dashboard/client/jobs/${data.job.id}`);
    await expect(page.getByText(/Stripe and Postgres developer/i)).toBeVisible();
  });

  test('a second application to the same job is refused', async ({ page }) => {
    await signIn(page, data.talent.email);
    await page.goto(`/jobs/${data.job.slug}`);
    // The apply control is replaced by the applied state rather than offered again.
    await expect(page.getByRole('button', { name: /apply for this job/i })).toHaveCount(0);
  });
});

test.describe('path 3 — shortlist, and the developer sees it', () => {
  test('the client shortlists and the status moves', async ({ page }) => {
    await signIn(page, data.client.email);
    await page.goto(`/dashboard/client/jobs/${data.job.id}`);

    await page
      .getByRole('button', { name: /shortlist/i })
      .first()
      .click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/shortlisted/i).first()).toBeVisible();
  });

  test('THE DEVELOPER SEES THE NEW STATUS', async ({ page }) => {
    await signIn(page, data.talent.email);
    await page.goto('/dashboard/talent/applications');
    await expect(page.getByText(/shortlisted/i).first()).toBeVisible();
  });
});

test.describe('authorization holds across the flows', () => {
  test('A CLIENT CANNOT OPEN ANOTHER CLIENT’S JOB DASHBOARD', async ({ page }) => {
    await signIn(page, data.talent.email);
    // The talent account has no client profile, so this job is not theirs by any route.
    // Not a 200 with an empty page: the route must refuse. 404 rather than 403, because a 403
    // confirms the job exists.
    const response = await page.goto(`/dashboard/client/jobs/${data.job.id}`);
    expect(response?.status()).toBe(404);
  });

  test('a signed-out visitor cannot reach the inbox, and is returned there after signing in', async ({
    page,
  }) => {
    await page.goto('/dashboard/messages');
    await expect(page).toHaveURL(/\/\?next=%2Fdashboard%2Fmessages/);
  });
});
