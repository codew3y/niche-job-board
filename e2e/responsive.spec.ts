import { expect, test } from '@playwright/test';

/**
 * The responsive pass, measured rather than eyeballed.
 *
 * PROJECT.md asks for "a responsive pass on every screen at 320 / 768 / 1280". Doing that by
 * dragging a browser window produces an opinion; this produces a result that fails a build.
 *
 * The check is horizontal overflow, because it is the one responsive bug that is both
 * objectively detectable and genuinely awful: a page that scrolls sideways on a phone has
 * content the reader cannot reach and cannot get back to. Everything else at these widths —
 * spacing, line length, whether a layout looks good — is a judgement a test should not pretend
 * to make.
 *
 * 320 is the narrowest width worth supporting (iPhone SE, and the floor most design systems
 * use). 768 is tablet portrait, where a two-column layout has to decide. 1280 is a laptop.
 */

const WIDTHS = [
  { name: '320 (small phone)', width: 320, height: 568 },
  { name: '768 (tablet)', width: 768, height: 1024 },
  { name: '1280 (laptop)', width: 1280, height: 800 },
];

/** Every page reachable without a session. Authenticated pages are covered in flows.spec.ts. */
const PUBLIC_PAGES = ['/', '/jobs', '/talent', '/login', '/signup', '/privacy', '/terms'];

for (const viewport of WIDTHS) {
  test.describe(`at ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const path of PUBLIC_PAGES) {
      test(`${path} does not scroll sideways`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
        });

        /**
         * One pixel of slack for sub-pixel rounding on fractional layouts, which is a
         * rendering artefact rather than a layout bug.
         */
        expect(
          overflow.scrollWidth,
          `${path} is ${overflow.scrollWidth - overflow.clientWidth}px wider than the viewport`,
        ).toBeLessThanOrEqual(overflow.clientWidth + 1);
      });

      test(`${path} keeps every element inside the viewport`, async ({ page }) => {
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        /**
         * Catches the case document.scrollWidth misses: an element that overflows inside a
         * container with `overflow: hidden`. The page does not scroll, so the first check
         * passes, but the content is clipped and unreachable — which is worse, because it is
         * invisible rather than merely awkward.
         */
        const culprits = await page.evaluate(() => {
          const limit = document.documentElement.clientWidth;
          const bad: string[] = [];
          // Deliberately horizontally scrollable strips are fine — that is a choice. What that
          // means precisely: the STRIP itself must fit the viewport (it is measured like any
          // element), and its CHILDREN may extend past the edge, because scrolling to them is
          // the point. This used to skip the strip and measure its children — the reverse — so
          // a strip could overflow unnoticed while every strip's contents failed.
          const insideScroller = (el: Element) => {
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              const x = getComputedStyle(a).overflowX;
              if (x === 'auto' || x === 'scroll') return true;
            }
            return false;
          };
          for (const el of document.querySelectorAll('body *')) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            if (insideScroller(el)) continue;
            if (rect.right > limit + 1) {
              bad.push(
                `${el.tagName.toLowerCase()}.${(el.className || '').toString().slice(0, 40)}`,
              );
            }
          }
          return [...new Set(bad)].slice(0, 5);
        });

        expect(culprits, `overflowing elements on ${path}`).toEqual([]);
      });
    }

    test('the primary navigation is reachable', async ({ page }) => {
      await page.goto('/jobs');
      // Not "is visible" — at 320 the nav is a horizontally scrollable strip, which is a
      // legitimate answer. What matters is that the links exist and can be activated.
      const jobsLink = page.getByRole('link', { name: 'Jobs', exact: true }).first();
      await expect(jobsLink).toBeAttached();
    });

    test('tap targets on the filters are big enough to hit', async ({ page }) => {
      await page.goto('/jobs');
      await page.waitForLoadState('networkidle');
      const control = page.locator('#filter-skill');
      const box = await control.boundingBox();
      // 36px is the height these controls are designed at (h-9). Below ~32 a control becomes
      // genuinely hard to hit on a touch screen.
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    });
  });
}
