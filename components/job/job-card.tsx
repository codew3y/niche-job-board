import Link from 'next/link';

import { ENGAGEMENT_LABEL, LOCATION_LABEL, formatRange } from '@/components/shared/money';
import { SaveButton } from '@/components/shared/save-button';
import type { JobListItem } from '@/lib/services/jobs';

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
  // Required skills first — they are what the hard-filter layer uses (§8), and what a
  // developer scans for to decide whether to keep reading.
  const skills = [...job.job_skills]
    .sort((a, b) => Number(b.is_required) - Number(a.is_required))
    .map((s) => s.skills?.name)
    .filter(Boolean)
    .slice(0, 5);

  return (
    <article className="border-b border-border-base p-5 transition-colors duration-[--duration-fast] last:border-0 hover:bg-surface-sunken">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-medium">
          {/* The whole card is not a link: that would swallow the skill tags and make the
              card a single enormous tab stop. */}
          <Link href={`/jobs/${job.slug}`} className="hover:text-accent">
            {job.title}
          </Link>
        </h2>
        <div className="flex items-center gap-3">
          {budget && <p className="text-sm font-medium tabular-nums">{budget}</p>}
          {saveable && <SaveButton kind="job" id={job.id} saved={saved} label={job.title} />}
        </div>
      </div>

      <p className="mt-1 text-sm text-text-muted">
        {job.client_profiles?.company_name ?? 'A client'}
        <span className="mx-1.5 text-text-subtle">·</span>
        {LOCATION_LABEL[job.location_type] ?? job.location_type}
        {job.location ? ` — ${job.location}` : ''}
        <span className="mx-1.5 text-text-subtle">·</span>
        {ENGAGEMENT_LABEL[job.engagement_type] ?? job.engagement_type}
      </p>

      <p className="mt-2 line-clamp-2 text-sm text-text-muted text-pretty">{job.description}</p>

      {skills.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((name) => (
            <li
              key={name}
              className="rounded-full bg-surface-sunken px-2.5 py-0.5 text-xs text-text-muted"
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
