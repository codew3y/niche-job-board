import Link from 'next/link';

import { formatRange } from '@/components/shared/money';
import { SaveButton } from '@/components/shared/save-button';
import { AVAILABILITY_LABEL, type TalentListItem } from '@/lib/services/talent';

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
    .filter(Boolean)
    .slice(0, 6);

  return (
    <article className="border-b border-border-base p-5 transition-colors duration-fast last:border-0 hover:bg-surface-sunken">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-base font-medium">
          <Link href={`/talent/${person.slug}`} className="hover:text-accent">
            {person.headline}
          </Link>
        </h2>
        <div className="flex items-center gap-3">
          {rate && <p className="text-sm font-medium tabular-nums">{rate}</p>}
          {saveable && (
            <SaveButton kind="talent" id={person.id} saved={saved} label={person.headline} />
          )}
        </div>
      </div>

      <p className="mt-1 text-sm text-text-muted">
        {AVAILABILITY_LABEL[person.availability] ?? person.availability}
        {person.years_experience ? ` · ${person.years_experience} yrs` : ''}
        {/* Evidence shape is stated, because it is what the whole product is about. */}
        <span className="mx-1.5 text-text-subtle">·</span>
        {person.portfolio_item_count > 0
          ? `${person.portfolio_item_count} project${person.portfolio_item_count === 1 ? '' : 's'}`
          : person.website_url
            ? 'Portfolio site'
            : ''}
      </p>

      <p className="mt-2 line-clamp-2 text-sm text-text-muted text-pretty">{person.bio}</p>

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
