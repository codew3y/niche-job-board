import type { Job } from '../services/job-types';

/**
 * JobPosting JSON-LD (§9).
 *
 * "The highest-leverage SEO item in the project" — it is what gets listings into Google Jobs,
 * which is where people actually search for work.
 *
 * Two rules decide whether Google accepts it:
 *   - `validThrough` must be present and in the future, or the posting is treated as expired
 *     and dropped. Expired jobs must also stop being served (§9).
 *   - salary is emitted ONLY when a real range exists. An invented or zero figure is worse
 *     than none: a structured-data violation, and it misleads the reader.
 */
export function jobPostingJsonLd(job: Job, siteUrl: string) {
  const company = job.client_profiles;

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    identifier: {
      '@type': 'PropertyValue',
      name: company?.company_name ?? 'TechSelect',
      value: job.id,
    },
    datePosted: job.published_at ?? job.created_at,
    // Every engagement type here is contract work — this is a freelance board (§1).
    employmentType: 'CONTRACTOR',
    hiringOrganization: {
      '@type': 'Organization',
      name: company?.company_name ?? 'Undisclosed',
      ...(company?.website ? { sameAs: company.website } : {}),
      ...(company?.logo_url ? { logo: company.logo_url } : {}),
    },
    url: `${siteUrl}/jobs/${job.slug}`,
  };

  if (job.deadline) base.validThrough = new Date(job.deadline).toISOString();

  if (job.location_type === 'remote') {
    base.jobLocationType = 'TELECOMMUTE';
    // Google ignores the remote flag unless applicantLocationRequirements accompanies it.
    base.applicantLocationRequirements = { '@type': 'Country', name: 'Worldwide' };
  } else if (job.location) {
    base.jobLocation = {
      '@type': 'Place',
      address: { '@type': 'PostalAddress', addressLocality: job.location },
    };
  }

  const min = job.budget_min ? Number(job.budget_min) : null;
  const max = job.budget_max ? Number(job.budget_max) : null;
  if (min !== null || max !== null) {
    base.baseSalary = {
      '@type': 'MonetaryAmount',
      currency: job.currency,
      value: {
        '@type': 'QuantitativeValue',
        ...(min !== null ? { minValue: min } : {}),
        ...(max !== null ? { maxValue: max } : {}),
        unitText: job.engagement_type === 'hourly' ? 'HOUR' : 'MONTH',
      },
    };
  }

  return base;
}
