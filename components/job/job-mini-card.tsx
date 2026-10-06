import { Briefcase } from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { ENGAGEMENT_LABEL, formatRange } from '@/components/shared/money';
import { Avatar } from '@/components/ui/avatar';
import type { JobListItem } from '@/lib/services/jobs';

/**
 * A job as a small card: client, title, budget, engagement and up to three skills, the whole
 * card one link (an `after:inset-0` overlay on the title). For short lists beside or under
 * other content, such as "Similar briefs"; Browse keeps the fuller JobCard row.
 */
export function JobMiniCard({ job }: { job: JobListItem }) {
  const client = job.client_profiles?.company_name ?? 'A client';
  const budget = formatRange(
    job.budget_min,
    job.budget_max,
    job.currency,
    job.engagement_type === 'hourly' ? '/hr' : '',
  );
  const skills = [...job.job_skills]
    .sort((a, b) => Number(b.is_required) - Number(a.is_required))
    .flatMap((s) => (s.skills?.name ? [s.skills.name] : []))
    .slice(0, 3);

  return (
    <article className="liftable relative flex h-full flex-col rounded-xl border border-border-base bg-surface-raised p-5 hover:border-border-strong">
      <div className="flex items-center gap-2.5">
        <Avatar name={client} src={job.client_profiles?.logo_url} size="sm" />
        <p className="min-w-0 truncate text-xs text-text-subtle">{client}</p>
      </div>
      <h3 className="mt-3 line-clamp-2 font-semibold tracking-tight text-balance">
        <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">
          {job.title}
        </Link>
      </h3>
      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        {budget && <span className="font-medium text-text tabular-nums">{budget}</span>}
        <span className="inline-flex items-center gap-1">
          <Briefcase aria-hidden="true" size={14} />
          {ENGAGEMENT_LABEL[job.engagement_type] ?? job.engagement_type}
        </span>
      </p>
      {skills.length > 0 && (
        <ul className="mt-auto flex flex-wrap gap-1.5 pt-4">
          {skills.map((s) => (
            <li
              key={s}
              className="rounded-sm border border-border-base bg-surface px-1.5 py-0.5 text-xs text-text-muted"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
