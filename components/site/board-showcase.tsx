import { ArrowRight, Briefcase, Clock, Kanban as FolderKanban } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { ENGAGEMENT_LABEL, formatRange } from '@/components/shared/money';
import { Avatar } from '@/components/ui/avatar';
import { listJobs, type JobListItem } from '@/lib/services/jobs';
import { AVAILABILITY_LABEL, listTalent, type TalentListItem } from '@/lib/services/talent';
import { cn } from '@/lib/ui/cn';

/**
 * The right-hand panel of the Freelancers and Clients intros: the board itself, live, in place of
 * a stock photograph. Freelancers see the briefs that are open right now; clients see developers
 * who are listed right now. Each entry links to the real page.
 *
 * Read through the same public services as Browse (RLS decides what is visible: open jobs,
 * published profiles). If the board is quiet, the panel says so and points to Browse rather than
 * padding itself with invented entries.
 *
 * SHAPE. The same frame and footprint as the photograph it replaces (frame-tray, 4:5 portrait from
 * `lg`, capped to the first screen), so the hero stays balanced: copy across 7 columns, panel
 * across 5. The list scrolls inside the frame; soft fades at the top and bottom say there is more.
 * Below `lg` it is a fixed-height panel under the copy.
 */

const SHOWN = 8;

function Panel({
  title,
  browseHref,
  browseLabel,
  children,
}: {
  title: string;
  browseHref: string;
  browseLabel: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="frame-tray lg:col-span-5">
      <div className="rounded-inner flex h-[30rem] flex-col overflow-hidden bg-surface-raised lg:mx-auto lg:aspect-4/5 lg:h-auto lg:max-h-[min(40rem,calc(100svh-9rem))]">
        <header className="flex items-center justify-between gap-3 border-b border-border-base px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2 text-sm font-semibold">
            {/* A live board, not a picture of one. */}
            <span aria-hidden="true" className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {title}
          </p>
          <Link
            href={browseHref}
            className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-sm font-medium text-link hover:bg-surface-sunken"
          >
            {browseLabel}
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </header>
        <div
          // Focusable so a keyboard user can scroll it; the fades are a mask, not an overlay, so
          // nothing sits on top of the links.
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [mask-image:linear-gradient(to_bottom,transparent,black_1.25rem,black_calc(100%-2.5rem),transparent)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function Quiet({ body, href, label }: { body: string; href: string; label: string }) {
  return (
    <div className="grid h-full place-content-center gap-3 p-8 text-center">
      <p className="text-text-muted">{body}</p>
      <Link href={href} className="prose-link text-sm font-medium">
        {label}
      </Link>
    </div>
  );
}

const ago = (iso: string | null) => {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'A month ago' : `${months} months ago`;
};

function Chips({ names }: { names: string[] }) {
  if (!names.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {names.map((n) => (
        <li
          key={n}
          className="rounded-sm border border-border-base bg-surface px-1.5 py-0.5 text-xs text-text-muted"
        >
          {n}
        </li>
      ))}
    </ul>
  );
}

function BriefRow({ job, i }: { job: JobListItem; i: number }) {
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
    <li
      className={cn(
        'liftable relative mx-2 my-2 rounded-lg border border-border-base bg-surface p-4 hover:border-border-strong',
        i === 0 && 'mt-3',
      )}
    >
      <div className="flex items-center gap-2.5">
        <Avatar name={client} src={job.client_profiles?.logo_url} size="sm" />
        <p className="min-w-0 truncate text-xs text-text-subtle">{client}</p>
        <p className="ml-auto shrink-0 text-xs text-text-subtle">{ago(job.published_at)}</p>
      </div>
      <h3 className="mt-2.5 line-clamp-2 font-semibold tracking-tight text-balance">
        <Link href={`/jobs/${job.slug}`} className="after:absolute after:inset-0">
          {job.title}
        </Link>
      </h3>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        {budget && <span className="font-medium text-text tabular-nums">{budget}</span>}
        <span className="inline-flex items-center gap-1">
          <Briefcase aria-hidden="true" size={14} />
          {ENGAGEMENT_LABEL[job.engagement_type] ?? job.engagement_type}
        </span>
      </p>
      <Chips names={skills} />
    </li>
  );
}

function DeveloperRow({ person, i }: { person: TalentListItem; i: number }) {
  const rate = formatRange(person.hourly_rate_min, person.hourly_rate_max, person.currency, '/hr');
  const skills = person.talent_skills.flatMap((s) => (s.skills?.name ? [s.skills.name] : []));
  return (
    <li
      className={cn(
        'liftable relative mx-2 my-2 rounded-lg border border-border-base bg-surface p-4 hover:border-border-strong',
        i === 0 && 'mt-3',
      )}
    >
      <div className="flex items-start gap-3">
        <Avatar name={person.headline} src={person.avatar_url} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-semibold tracking-tight text-balance">
            <Link href={`/talent/${person.slug}`} className="after:absolute after:inset-0">
              {person.headline}
            </Link>
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
            {rate && <span className="font-medium text-text tabular-nums">{rate}</span>}
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden="true" size={14} />
              {AVAILABILITY_LABEL[person.availability] ?? person.availability}
            </span>
            {person.portfolio_item_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <FolderKanban aria-hidden="true" size={14} />
                {person.portfolio_item_count}{' '}
                {person.portfolio_item_count === 1 ? 'project' : 'projects'}
              </span>
            )}
          </p>
        </div>
      </div>
      <Chips names={skills.slice(0, 3)} />
    </li>
  );
}

/** Open briefs, newest first: the Freelancers intro. */
export async function BriefsShowcase() {
  const { jobs } = await listJobs({ sort: 'recent', limit: SHOWN, skills: [] });
  return (
    <Panel title="Open briefs" browseHref="/browse?type=jobs" browseLabel="All jobs">
      {jobs.length ? (
        <ul className="pb-6">
          {jobs.map((job, i) => (
            <BriefRow key={job.id} job={job} i={i} />
          ))}
        </ul>
      ) : (
        <Quiet
          body="No briefs are open at this moment. New ones appear here as clients publish them."
          href="/browse?type=jobs"
          label="Browse jobs"
        />
      )}
    </Panel>
  );
}

/** Listed developers, most recently updated first: the Clients intro. */
export async function DevelopersShowcase() {
  const { talent } = await listTalent({ limit: SHOWN, skills: [] });
  return (
    <Panel
      title="Developers on the board"
      browseHref="/browse?type=developers"
      browseLabel="All developers"
    >
      {talent.length ? (
        <ul className="pb-6">
          {talent.map((person, i) => (
            <DeveloperRow key={person.id} person={person} i={i} />
          ))}
        </ul>
      ) : (
        <Quiet
          body="No developers are listed at this moment. Profiles appear here as they are published."
          href="/browse?type=developers"
          label="Browse developers"
        />
      )}
    </Panel>
  );
}
