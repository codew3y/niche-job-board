import Link from 'next/link';

import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { SaveButton } from '@/components/shared/save-button';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import type { JobListItem } from '@/lib/services/jobs';

/**
 * A job in a browse list.
 *
 * The WHOLE ROW is the link target, through an `after:inset-0` overlay on the title link —
 * without wrapping the row in an <a>, which would make every tag and the bookmark part of one
 * enormous link and one enormous tab stop. The bookmark sits above the overlay (`z-raised`) and
 * stays its own control.
 *
 * Required skills first — they are what the hard-filter layer uses (§8), and what a developer
 * scans for to decide whether to keep reading.
 */
export function JobCard({
  job,
  saveable = false,
  saved = false,
}: {
  job: JobListItem;
  /** False for signed-out visitors and for clients — neither has a jobs list to save into. */
  saveable?: boolean;
  saved?: boolean;
}) {
  const budget = formatRange(
    job.budget_min,
    job.budget_max,
    job.currency,
    job.engagement_type === 'hourly' ? '/hr' : '',
  );
  const skills = [...job.job_skills]
    .sort((a, b) => Number(b.is_required) - Number(a.is_required))
    .filter((s) => s.skills?.name)
    .slice(0, 5)
    .map((s) => ({ name: s.skills!.name, strong: s.is_required }));
  const company = job.client_profiles?.company_name ?? 'A client';

  return (
    <article className="relative flex gap-4 border-b border-border-base px-5 py-5 transition-colors duration-fast ease-out last:border-0 hover:bg-surface-sunken/50 sm:px-6">
      <Avatar name={company} className="hidden sm:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h2 className="text-base font-semibold tracking-tight text-balance">
            <Link
              href={`/jobs/${job.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {job.title}
            </Link>
          </h2>
          {budget && (
            <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{budget}</p>
          )}
        </div>

        <p className="mt-1 text-sm text-text-subtle">
          {company}
          <span aria-hidden="true"> · </span>
          {LOCATION_LABEL[job.location_type] ?? job.location_type}
          {job.location ? ` — ${job.location}` : ''}
          <span aria-hidden="true"> · </span>
          {ENGAGEMENT_LABEL[job.engagement_type] ?? job.engagement_type}
        </p>

        <p className="mt-2.5 line-clamp-2 text-sm text-text-muted text-pretty">{job.description}</p>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <TagList tags={skills} label="Skills" />
          {saveable && <SaveButton kind="job" id={job.id} saved={saved} label={job.title} />}
        </div>
      </div>
    </article>
  );
}
