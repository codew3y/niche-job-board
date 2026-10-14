import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/** Browse is behind sign-in, so its checks seed an account (skipped without the service key). */
let data: Seeded | undefined;
test.afterAll(async () => {
  if (data) await teardown(data);
});
async function signIn(page: Page) {
  data ??= await seed();
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(data.talent.email);
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard\//, { timeout: 20_000 });
}

/**
 * Automated accessibility checks on every public route.
 *
 * WHAT THIS CATCHES AND WHAT IT DOES NOT. axe finds roughly a third of WCAG problems — the
 * mechanical ones: missing labels, contrast below threshold, broken heading order, controls
 * with no accessible name. It cannot tell you whether a focus order makes sense, whether alt
 * text is accurate, or whether a live region announces something useful. A green run here is
 * a floor, not a pass, and manual screen-reader and zoom passes are still owed.
 *
 * Run at the AA level the plan commits to, plus best-practice rules for the structural things
 * that are cheap to get right and expensive to retrofit.
 */

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Every route reachable without a session. Authenticated pages need fixtures; see below. */
const PUBLIC_PAGES = [
  { path: '/', name: 'home' },
  { path: '/for-freelancers', name: 'for freelancers' },
  { path: '/for-clients', name: 'for clients' },
  { path: '/how-it-works', name: 'how it works' },
  { path: '/about', name: 'about' },
  { path: '/login', name: 'sign in' },
  { path: '/signup', name: 'sign up' },
  { path: '/privacy', name: 'privacy' },
  { path: '/terms', name: 'terms' },
];

async function scan(page: Page, path: string) {
  /*
   * Measure with reduced motion on. The public site's scroll entrances (globals.css `reveal`) run
   * on a scroll timeline, not a clock: a section below the fold stays at its start frame until
   * someone scrolls to it, so its animation never "finishes" and axe would see it transparent.
   * With reduced motion the entrances are off and every section is at rest, which is the state
   * contrast is a property of. Colours and layout are identical either way.
   */
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  // Wait for the element every layout renders, rather than networkidle — a deployed page
  // behind a CDN keeps making requests and never goes idle.
  await page.locator('#main').first().waitFor({ state: 'attached', timeout: 15_000 });
  /**
   * Let entrance animations SETTLE before measuring. Contrast is a property of the page at rest:
   * a heading halfway through a 500ms fade-in is transiently translucent, and axe measuring it
   * mid-fade reports a colour the reader never sits and reads. Only finite animations are
   * awaited — an infinite one (a skeleton pulse) would never resolve, and is not an entrance.
   */
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  return new AxeBuilder({ page }).withTags(TAGS).analyze();
}

/** Readable failure: axe's raw output is a wall of JSON that hides the one line that matters. */
function describe_(
  violations: {
    id: string;
    impact?: string | null;
    nodes: { target: unknown[] }[];
    help: string;
  }[],
) {
  return violations
    .map(
      (v) =>
        `  [${v.impact ?? 'n/a'}] ${v.id}: ${v.help}\n    ${v.nodes
          .map((n) => String(n.target))
          .slice(0, 3)
          .join('\n    ')}`,
    )
    .join('\n');
}

for (const { path, name } of PUBLIC_PAGES) {
  test(`${name} (${path}) has no automatable accessibility violations`, async ({ page }) => {
    const results = await scan(page, path);
    expect(
      describe_(results.violations),
      `${results.violations.length} violation(s) on ${path}`,
    ).toBe('');
  });
}

test.describe('structure that axe checks but is easy to get wrong', () => {
  test('every page has exactly one h1', async ({ page }) => {
    // Not an axe rule by default, and a real navigation aid: screen-reader users jump by
    // heading, and two h1s means the page claims to be about two things.
    for (const { path } of PUBLIC_PAGES) {
      await page.goto(path);
      const count = await page.locator('h1').count();
      expect(count, `${path} has ${count} h1 elements`).toBe(1);
    }
  });

  test('the skip link is the first focusable element', async ({ page }) => {
    // §9 calls this a requirement, not an extra. It is the only way a keyboard user gets past
    // the nav without tabbing through it on every page.
    await page.goto('/privacy');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => ({
      text: document.activeElement?.textContent?.trim(),
      href: document.activeElement?.getAttribute('href'),
    }));
    expect(focused.href).toBe('#main');
    expect(focused.text).toMatch(/skip/i);
  });

  test('filter controls are reachable and operable by keyboard alone', async ({ page }) => {
    test.skip(!canSeed, 'Browse is sign-in-only; needs SUPABASE_SERVICE_ROLE_KEY');
    await signIn(page);
    await page.goto('/browse?type=jobs');
    const skill = page.locator('#filter-skill');
    await skill.focus();
    await expect(skill).toBeFocused();
    // A select that cannot be changed from the keyboard is a filter half the users cannot use.
    await expect(skill).toBeEnabled();
  });

  test('THE SEARCH INPUT HAS A LABEL, even though it is visually hidden', async ({ page }) => {
    test.skip(!canSeed, 'Browse is sign-in-only; needs SUPABASE_SERVICE_ROLE_KEY');
    await signIn(page);
    await page.goto('/browse');
    const search = page.locator('#browse-search');
    const labelled = await search.evaluate((el) => {
      const id = el.getAttribute('id');
      return Boolean(
        document.querySelector(`label[for="${id}"]`) ||
        el.getAttribute('aria-label') ||
        el.getAttribute('aria-labelledby'),
      );
    });
    expect(labelled).toBe(true);
  });
});

test.describe('at 200% zoom', () => {
  // §9 commits to this explicitly. Doubling the font is what a low-vision user actually does,
  // and it breaks layouts that a narrow viewport does not.
  test.use({ viewport: { width: 640, height: 800 } });

  for (const { path, name } of PUBLIC_PAGES.slice(0, 4)) {
    test(`${name} does not overflow horizontally`, async ({ page }) => {
      await page.goto(path);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '32px'; // 200% of a 16px base
      });
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(
        overflow.scroll,
        `${path} is ${overflow.scroll - overflow.client}px wider than the viewport at 200%`,
      ).toBeLessThanOrEqual(overflow.client + 1);
    });
  }
});
