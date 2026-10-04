import { expect, test, type Page } from '@playwright/test';

import { canSeed, PASSWORD, seed, teardown, type Seeded } from './fixtures';

/**
 * Certifications (migration 0022), end to end: a developer adds one in the profile editor, it
 * appears on their public profile with a Verify link, an expired one is labelled rather than
 * hidden, and removing one takes it off the public page.
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

async function addCertification(
  page: Page,
  cert: { name: string; issuer: string; issued: string; expires?: string; url?: string },
) {
  const section = page.locator('#certifications');
  await section.getByRole('button', { name: 'Add a certification' }).click();
  await section.getByLabel('Certification').fill(cert.name);
  await section.getByLabel('Issued by').fill(cert.issuer);
  await section.getByLabel('Issued', { exact: true }).fill(cert.issued);
  if (cert.expires) await section.getByLabel(/^Expires/).fill(cert.expires);
  if (cert.url) await section.getByLabel(/^Verification link/).fill(cert.url);
  await section.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(section.getByText(`${cert.name} · ${cert.issuer}`)).toBeVisible();
}

test('a certification goes from the editor to the public profile, and back off it', async ({
  page,
}) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile');

  await addCertification(page, {
    name: 'AWS Certified Developer, Associate',
    issuer: 'Amazon Web Services',
    issued: '2024-03',
    url: 'https://www.credly.com/badges/e2e-example',
  });
  await addCertification(page, {
    name: 'Old Scrum Certificate',
    issuer: 'Scrum Alliance',
    issued: '2019-01',
    expires: '2021-01',
  });

  await page.goto(`/talent/${data.talent.slug}`);
  const section = page.getByRole('region', { name: 'Certifications' });
  // .first(): the name is also inside the Verify link, for screen readers ("Verify <name>").
  await expect(section.getByText('AWS Certified Developer, Associate').first()).toBeVisible();
  await expect(section.getByText('Amazon Web Services · Issued Mar 2024')).toBeVisible();
  await expect(
    section.getByRole('link', { name: /Verify AWS Certified Developer/ }),
  ).toHaveAttribute('href', 'https://www.credly.com/badges/e2e-example');
  // Expired: still shown, labelled.
  await expect(section.getByText('Old Scrum Certificate')).toBeVisible();
  await expect(section.getByText('Expired', { exact: true })).toBeVisible();

  // Remove one in the editor; it leaves the public page.
  await page.goto('/dashboard/talent/profile');
  await page
    .locator('#certifications')
    .getByRole('button', { name: 'Remove Old Scrum Certificate · Scrum Alliance' })
    .click();
  await expect(page.locator('#certifications').getByText('Old Scrum Certificate')).toHaveCount(0);
  await page.goto(`/talent/${data.talent.slug}`);
  await expect(page.getByText('Old Scrum Certificate')).toHaveCount(0);
  await expect(page.getByText('AWS Certified Developer, Associate').first()).toBeVisible();
});

test('an expiry before the issue date is refused on the field', async ({ page }) => {
  await signIn(page, data.talent.email);
  await page.goto('/dashboard/talent/profile');
  const section = page.locator('#certifications');
  await section.getByRole('button', { name: 'Add a certification' }).click();
  await section.getByLabel('Certification').fill('Backwards Cert');
  await section.getByLabel('Issued by').fill('Nobody');
  await section.getByLabel('Issued', { exact: true }).fill('2025-06');
  await section.getByLabel(/^Expires/).fill('2024-06');
  await section.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(section.getByText('Expiry cannot be before the issue date.')).toBeVisible();
});
