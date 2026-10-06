import {
  ArrowLeft,
  SealCheck as BadgeCheck,
  Briefcase,
  Globe,
  PencilSimple as Pencil,
} from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JobCard } from '@/components/job/job-card';
import { ExternalLink } from '@/components/shared/external-link';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { siteUrl } from '@/lib/env';
import { getCompany, listCompanyOpenJobs } from '@/lib/services/company';
import { canSave, savedJobIds } from '@/lib/services/saved-ids';
import { getClientProfileId } from '@/lib/supabase/session';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) return { title: 'Company not found' };
  const jobs = await listCompanyOpenJobs(company.id);
  return {
    title: company.company_name,
    description:
      company.about.trim().slice(0, 155) ||
      `Open software, web and automation work from ${company.company_name} on TechSelect.`,
    alternates: { canonical: `${siteUrl()}/company/${company.id}` },
    // A company with nothing open is a thin page; keep it out of search until it has work.
    robots: jobs.length === 0 ? { index: false, follow: true } : undefined,
  };
}

/**
 * The public company page: who the client is and what they have open.
 *
 * Public for anyone, like the job and developer detail pages (route-policy
 * PUBLIC_DETAIL_PREFIXES), because it is where a job's company name leads. It shows exactly
 * what every job page already shows about the company (name, industry, about, website) plus
 * the open jobs. Closed and filled jobs are left out: a list of work you cannot apply for is
 * noise here. The owner sees a banner with a way to edit.
 */
export default async function CompanyPage({ params }: Params) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const [jobs, ownId] = await Promise.all([listCompanyOpenJobs(company.id), getClientProfileId()]);
  const isOwner = ownId === company.id;
  const [saveable, saved] = await Promise.all([canSave('job'), savedJobIds(jobs.map((j) => j.id))]);
  const website = company.website?.replace(/^https:\/\//, '').replace(/\/$/, '');

  return (
    <div className="@container">
      <Link
        href="/browse?type=jobs"
        className="-ml-2 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-text-muted hover:bg-surface-sunken hover:text-text"
      >
        <ArrowLeft aria-hidden="true" size={16} />
        Browse jobs
      </Link>

      {isOwner && (
        <div
          role="note"
          className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-base bg-primary-subtle px-4 py-3 text-sm text-text"
        >
          <p>This is how developers see your client page.</p>
          <Link
            href="/dashboard/client/profile"
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
          >
            <Pencil aria-hidden="true" />
            Edit client profile
          </Link>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-10 @3xl:grid-cols-[minmax(0,1fr)_18rem]">
        <header className="min-w-0 @3xl:col-start-1 @3xl:row-start-1">
          <div className="flex items-start gap-4">
            <Avatar name={company.company_name} src={company.logo_url} size="lg" />
            <div className="min-w-0">
              <h1 className="font-semibold text-display-sm break-words text-balance sm:text-display-md">
                {company.company_name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {company.industry && <Badge tone="neutral">{company.industry}</Badge>}
                {company.is_verified && (
                  <Badge tone="success">
                    <BadgeCheck aria-hidden="true" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {company.about.trim() ? (
            <p className="mt-6 max-w-[65ch] leading-relaxed whitespace-pre-line text-text-muted text-pretty">
              {company.about}
            </p>
          ) : (
            <p className="mt-6 text-text-subtle">
              {company.company_name} has not added a description yet.
            </p>
          )}
        </header>

        {/* Facts: the one raised panel on the page. Beside the intro from @3xl, under it before. */}
        <aside
          aria-label="Company details"
          className="@3xl:col-start-2 @3xl:row-span-2 @3xl:row-start-1"
        >
          <dl className="rounded-lg border border-border-base bg-surface-raised p-5">
            <div className="flex items-center gap-3">
              <dt className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary">
                <Briefcase aria-hidden="true" size={18} weight="duotone" />
                <span className="sr-only">Open jobs</span>
              </dt>
              <dd className="text-sm">
                <span className="font-display text-2xl font-semibold tabular-nums">
                  {jobs.length}
                </span>{' '}
                <span className="text-text-muted">
                  {jobs.length === 1 ? 'open job' : 'open jobs'}
                </span>
              </dd>
            </div>
            {website && (
              <div className="mt-4 flex items-center gap-3 border-t border-border-base pt-4">
                <dt className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-subtle text-primary">
                  <Globe aria-hidden="true" size={18} weight="duotone" />
                  <span className="sr-only">Website</span>
                </dt>
                <dd className="min-w-0 text-sm break-all">
                  <ExternalLink href={company.website} className="font-semibold">
                    {website}
                  </ExternalLink>
                </dd>
              </div>
            )}
          </dl>
        </aside>

        <section
          aria-labelledby="jobs-heading"
          className="min-w-0 @3xl:col-start-1 @3xl:row-start-2"
        >
          <h2 id="jobs-heading" className="text-xl font-semibold tracking-tight">
            Open jobs
          </h2>
          {jobs.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-border-base bg-surface-raised">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} saveable={saveable} saved={saved.has(job.id)} />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              title="No open jobs right now"
              body={
                isOwner
                  ? 'Post a brief and it will appear here for developers to find.'
                  : `${company.company_name} has nothing open at the moment. Browse jobs from other companies in the meantime.`
              }
              action={
                <Link
                  href={isOwner ? '/dashboard/client/jobs/new' : '/browse?type=jobs'}
                  className={buttonStyles({ variant: isOwner ? 'primary' : 'secondary' })}
                >
                  {isOwner ? 'Post a job' : 'Browse jobs'}
                </Link>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
