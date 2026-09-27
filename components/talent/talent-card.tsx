import Link from 'next/link';

import { formatRange } from '@/components/shared/money';
import { SaveButton } from '@/components/shared/save-button';
import { Avatar } from '@/components/ui/avatar';
import { TagList } from '@/components/ui/badge';
import { AVAILABILITY_LABEL, type TalentListItem } from '@/lib/services/talent';

/**
 * A developer in a browse list. Same row-as-link pattern as JobCard. The evidence shape — how
 * many projects, or a portfolio site — is stated on every card, because it is what the whole
 * product is about.
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

  return (
    <article className="relative flex gap-4 border-b border-border-base px-5 py-5 transition-colors duration-fast ease-out last:border-0 hover:bg-surface-sunken/50 sm:px-6">
      <Avatar name={person.headline} className="hidden sm:grid" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <h2 className="text-base font-semibold tracking-tight text-balance">
            <Link
              href={`/talent/${person.slug}`}
              className="after:absolute after:inset-0 hover:underline"
            >
              {person.headline}
            </Link>
          </h2>
          {rate && <p className="text-sm font-semibold whitespace-nowrap tabular-nums">{rate}</p>}
        </div>

        <p className="mt-1 text-sm text-text-subtle">
          {AVAILABILITY_LABEL[person.availability] ?? person.availability}
          {person.years_experience ? ` · ${person.years_experience} yrs` : ''}
          {evidence && (
            <>
              <span aria-hidden="true"> · </span>
              {evidence}
            </>
          )}
        </p>

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
