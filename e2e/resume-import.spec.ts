import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';
import { makePdf } from './fixtures/make-pdf';

/**
 * Resume import, end to end: upload a real PDF, review the draft, add what is ticked, see it on
 * the profile.
 *
 * The model's answer is the fixed draft in e2e/fixtures/resume-draft.json (playwright.config.ts
 * sets RESUME_IMPORT_FIXTURE); the PDF check, text extraction, contact removal, both daily limits,
 * the answer's validation, the review screen and every write run for real.
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

const RESUME = makePdf([
  'Maria Santos',
  'maria.santos@example.com   +63 917 555 0142',
  'Full-stack developer, payments and integrations',
  'Senior Developer, Ledgerline, March 2021 - present. Led the billing rebuild onto Stripe.',
  'Skills: TypeScript, PostgreSQL, Docker. Certified Cloud Practitioner, Amazon Web Services, 2023.',
  'BS Computer Science, University of the Philippines Diliman, 2012 - 2016.',
]);

test('a resume becomes a reviewed draft, and only the ticked items reach the profile', async ({
  page,
}) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile');
  await page.getByRole('link', { name: 'Import from resume' }).click();
  await expect(page).toHaveURL(/\/dashboard\/talent\/profile\/import$/);

  await page
    .getByLabel('Your resume (PDF)')
    .setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: RESUME });
  await page.getByLabel(/I understand how my resume is read/).check();
  await page.getByRole('button', { name: 'Read my resume' }).click();

  // Review.
  await expect(page.getByText('This is what we found.')).toBeVisible({ timeout: 30_000 });
  const skills = page.getByRole('region', { name: 'Skills' });
  await expect(skills.getByText('PostgreSQL')).toBeVisible(); // matched through the alias "postgres"
  await expect(skills.getByText(/Not in our skill list, so not added: COBOL 74/)).toBeVisible();

  // Items missing what the profile requires are shown, disabled, with the reason.
  const undated = page.getByRole('checkbox', { name: /Junior Developer · Undated Ltd/ });
  await expect(undated).toBeDisabled();
  await expect(page.getByText(/No start date in your resume/)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: /Tiny thing/ })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /Undated Certificate/ })).toBeDisabled();

  // Untick education; keep the rest.
  await page.getByRole('checkbox', { name: /University of the Philippines Diliman/ }).uncheck();
  await page.getByRole('button', { name: /^Add \d+ items to my profile$/ }).click();

  // Back on the profile, with the result said in words.
  await expect(page).toHaveURL(/\/dashboard\/talent\/profile\?imported=\d+/);
  await expect(
    page.getByRole('status').filter({ hasText: /Added \d+ items from your resume/ }),
  ).toBeVisible();
  await expect(
    page.locator('#experience').getByText('Senior Developer · Ledgerline'),
  ).toBeVisible();
  await expect(
    page.locator('#certifications').getByText('Imported Cloud Practitioner · Amazon Web Services'),
  ).toBeVisible();
  await expect(
    page.locator('#projects').getByText('Imported subscription migration'),
  ).toBeVisible();
  // Unticked and invalid items did not get in.
  await expect(page.getByText('University of the Philippines Diliman')).toHaveCount(0);
  await expect(page.getByText('Undated Ltd')).toHaveCount(0);

  // The public profile shows the imported certification.
  await page.goto(`/talent/${data.talent.slug}`);
  await expect(page.getByText('Imported Cloud Practitioner').first()).toBeVisible();
});

test('a file that is not a PDF is refused before anything is read', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile/import');
  await page.getByLabel('Your resume (PDF)').setInputFiles({
    name: 'resume.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('this is plain text pretending to be a PDF'),
  });
  await page.getByLabel(/I understand how my resume is read/).check();
  await page.getByRole('button', { name: 'Read my resume' }).click();
  await expect(page.getByText(/Upload your resume as a PDF/)).toBeVisible();
});
