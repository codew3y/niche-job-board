import { describe, expect, it } from 'vitest';

import { jobPostingJsonLd } from './job-posting';
import type { Job } from '@/lib/services/job-types';

/**
 * §9 calls JobPosting the highest-leverage SEO item in the project, and structured data
 * fails silently — Google drops a malformed posting without telling anyone. These assert the
 * rules that decide acceptance.
 */
const base: Job = {
  id: 'job-1',
  slug: 'stripe-integration',
  title: 'Stripe integration',
  description: 'Wire up Stripe Checkout with reliable webhooks.',
  responsibilities: null,
  requirements: null,
  engagement_type: 'fixed',
  budget_min: '2000',
  budget_max: '4000',
  currency: 'USD',
  location_type: 'remote',
  location: null,
  experience_level: 'senior',
  status: 'open',
  deadline: '2026-12-01T00:00:00.000Z',
  published_at: '2026-09-01T00:00:00.000Z',
  created_at: '2026-08-30T00:00:00.000Z',
  client_profiles: {
    id: 'c1',
    company_name: 'Northwind',
    website: 'https://northwind.example',
    industry: 'Logistics',
    about: null,
    logo_url: null,
  },
  job_skills: [],
};

const SITE = 'https://techselect.vercel.app';

describe('required fields Google will not accept a posting without', () => {
  it('emits every one', () => {
    const ld = jobPostingJsonLd(base, SITE);
    for (const key of [
      '@context',
      '@type',
      'title',
      'description',
      'datePosted',
      'hiringOrganization',
    ]) {
      expect(ld[key], `missing ${key}`).toBeDefined();
    }
    expect(ld['@type']).toBe('JobPosting');
  });

  it('falls back to created_at when a job was never formally published', () => {
    const ld = jobPostingJsonLd({ ...base, published_at: null }, SITE);
    expect(ld.datePosted).toBe(base.created_at);
  });

  it('uses an absolute canonical URL, not a path', () => {
    expect(jobPostingJsonLd(base, SITE).url).toBe(`${SITE}/jobs/stripe-integration`);
  });
});

describe('remote jobs', () => {
  it('pairs TELECOMMUTE with applicantLocationRequirements', () => {
    // Google ignores the remote flag without it, which quietly costs the listing its
    // "remote" facet.
    const ld = jobPostingJsonLd(base, SITE);
    expect(ld.jobLocationType).toBe('TELECOMMUTE');
    expect(ld.applicantLocationRequirements).toBeDefined();
  });

  it('emits a physical location for onsite work instead', () => {
    const ld = jobPostingJsonLd({ ...base, location_type: 'onsite', location: 'Zurich' }, SITE);
    expect(ld.jobLocationType).toBeUndefined();
    expect(JSON.stringify(ld.jobLocation)).toContain('Zurich');
  });
});

describe('salary — emitted only when real', () => {
  it('includes a range when one exists', () => {
    const salary = jobPostingJsonLd(base, SITE).baseSalary as Record<string, never>;
    expect(JSON.stringify(salary)).toContain('2000');
    expect(JSON.stringify(salary)).toContain('4000');
    expect(JSON.stringify(salary)).toContain('USD');
  });

  it('OMITS baseSalary entirely when there is no budget', () => {
    // An invented or zero figure is a structured-data violation AND misleads the reader.
    // Omission is the correct answer, not a placeholder.
    const ld = jobPostingJsonLd({ ...base, budget_min: null, budget_max: null }, SITE);
    expect(ld.baseSalary).toBeUndefined();
  });

  it('handles a one-sided range without inventing the other end', () => {
    const ld = jobPostingJsonLd({ ...base, budget_max: null }, SITE);
    const s = JSON.stringify(ld.baseSalary);
    expect(s).toContain('minValue');
    expect(s).not.toContain('maxValue');
  });

  it('marks hourly work as HOUR so the figure is not read as a monthly salary', () => {
    const ld = jobPostingJsonLd({ ...base, engagement_type: 'hourly' }, SITE);
    expect(JSON.stringify(ld.baseSalary)).toContain('HOUR');
  });
});

describe('validThrough', () => {
  it('is emitted as an ISO timestamp when a deadline exists', () => {
    expect(jobPostingJsonLd(base, SITE).validThrough).toBe('2026-12-01T00:00:00.000Z');
  });

  it('is omitted rather than guessed when there is no deadline', () => {
    expect(jobPostingJsonLd({ ...base, deadline: null }, SITE).validThrough).toBeUndefined();
  });
});

describe('hiring organization', () => {
  it('carries the company website as sameAs, which is how Google links the entity', () => {
    const org = jobPostingJsonLd(base, SITE).hiringOrganization as Record<string, unknown>;
    expect(org.name).toBe('Northwind');
    expect(org.sameAs).toBe('https://northwind.example');
  });

  it('degrades to Undisclosed rather than crashing when the client row is missing', () => {
    const org = jobPostingJsonLd({ ...base, client_profiles: null }, SITE)
      .hiringOrganization as Record<string, unknown>;
    expect(org.name).toBe('Undisclosed');
    expect(org.sameAs).toBeUndefined();
  });
});

describe('every engagement type is contract work', () => {
  it.each(['fixed', 'hourly', 'retainer'])('%s → CONTRACTOR', (type) => {
    // This is a freelance board (§1). Emitting FULL_TIME would put listings in front of
    // people looking for employment.
    expect(jobPostingJsonLd({ ...base, engagement_type: type }, SITE).employmentType).toBe(
      'CONTRACTOR',
    );
  });
});
