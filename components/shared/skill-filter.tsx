'use client';

import { FilterSelect } from './filter-select';
import type { SkillOption } from '@/lib/services/skills';

/**
 * Skill filter, grouped by category.
 *
 * A single select rather than a multi-select: 126 options across 10 categories is already at
 * the limit of what a plain control can carry, and a multi-select of that size needs a
 * combobox with search, keyboard handling and a token list — which is its own piece of work
 * rather than a checkbox on this one.
 *
 * The URL parameter is a comma-separated list either way, so multiple skills are already
 * supported by the service and by anyone editing the query string. Widening the control later
 * changes no server code.
 */
export function SkillFilter({
  skills,
  value,
  onChange,
}: {
  skills: [string, SkillOption[]][];
  value: string;
  onChange: (slug: string) => void;
}) {
  return (
    <FilterSelect
      id="filter-skill"
      label="Skill"
      value={value}
      onChange={onChange}
      className="max-w-[14rem]"
    >
      <option value="">Skill: any</option>
      {skills.map(([category, options]) => (
        <optgroup key={category} label={category}>
          {options.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </FilterSelect>
  );
}
