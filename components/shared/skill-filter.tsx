'use client';

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
    <span className="inline-flex items-center">
      <label className="sr-only" htmlFor="filter-skill">
        Skill
      </label>
      <select
        id="filter-skill"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 max-w-[12rem] rounded-sm border px-2.5 text-sm transition-colors duration-fast
          ${value ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface-raised'}`}
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
      </select>
    </span>
  );
}
