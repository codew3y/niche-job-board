import { Briefcase, Clock, FolderKanban } from 'lucide-react';
import Link from 'next/link';

import { formatRange } from '@/components/shared/money';
import { SaveButton } from '@/components/shared/save-button';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import { AVAILABILITY_LABEL, type TalentListItem } from '@/lib/services/talent';

/**
 * A developer in a browse list. Same row-as-link pattern as JobCard. The evidence shape (how
 * many projects, or a portfolio site) is stated on every card, because it is what the whole
 * product is about.
 *
 * Hierarchy: the headline is the title, the rate sits opposite it, the facts follow in one
 * muted line, and Save is the single action.
 */
export function TalentCard({
  person,
  saveable = false,
  saved = false,
}: {
  person: TalentListItem;
  /** Only a client has a saved-developers list; hidden for everyone else. */
  saveable?: boolean;
  saved?: boolean;
}) {
  const rate = formatRange(person.hourly_rate_min, person.hourly_rate_max, person.currency, '/hr');
  const skills = person.talent_skills
    .map((s) => s.skills?.name)
    .filter((n): n is string => Boolean(n))
    .slice(0, 6)
    .map((name) => ({ name }));
  const evidence =
    person.portfolio_item_count > 0
      ? `${person.portfolio_item_count} project${person.portfolio_item_count === 1 ? '' : 's'}`
      : person.website_url
        ? 'Portfolio site'
        : null;

  const facts = [
    { icon: Clock, text: AVAILABILITY_LABEL[person.availability] ?? person.availability },
    person.years_experience
      ? {
          icon: Briefcase,
          text: `${person.years_experience} ${person.years_experience === 1 ? 'year' : 'years'}`,
        }
      : null,
    evidence ? { icon: FolderKanban, text: evidence } : null,
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  return (
    <article className="relative flex gap-4 border-b border-border-base px-4 py-5 transition-colors duration-fast ease-out last:border-0 hover:bg-surface-sunken/60 sm:px-6">
      <Avatar name={person.headline} className="hidden sm:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="min-w-0 text-base font-semibold tracking-tight text-balance">
            <Link
              href={`/talent/${person.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {person.headline}
            </Link>
          </h2>
          {rate && (
            <p className="text-sm font-semibold whitespace-nowrap text-text tabular-nums">{rate}</p>
          )}
        </div>

        {/* Key facts as a short list with icons, not a dot-separated string: each fact stays
            whole when the line wraps on a phone. */}
        <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
          {facts.map(({ icon: Icon, text }) => (
            <li key={text} className="inline-flex items-center gap-1.5 tabular-nums">
              <Icon aria-hidden="true" size={14} className="shrink-0 text-text-subtle" />
              {text}
            </li>
          ))}
        </ul>

        <p className="mt-2.5 line-clamp-2 text-sm text-text-muted text-pretty">{person.bio}</p>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
          <TagList tags={skills} label="Skills" />
          {saveable && (
            <SaveButton kind="talent" id={person.id} saved={saved} label={person.headline} />
          )}
        </div>
      </div>
    </article>
  );
}
