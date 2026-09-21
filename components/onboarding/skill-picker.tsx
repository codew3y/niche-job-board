'use client';

import { useMemo, useState } from 'react';

export type SkillOption = { id: string; name: string; category: string; aliases: string[] };

/**
 * Skill picker over the seeded taxonomy (126 skills, 10 categories).
 *
 * Free text is deliberately impossible: every tag resolves to a taxonomy row, which is what
 * keeps filters and matching clean (PROJECT.md §4.6). Search also matches ALIASES, so a
 * client typing "WhatsApp chatbot" finds `WhatsApp Business API` and someone typing "Golang"
 * finds `Go` — that alias bridge is the whole point of the taxonomy's alias policy.
 */
export function SkillPicker({
  options,
  initial = [],
  name = 'skillId',
  max = 30,
}: {
  options: SkillOption[];
  initial?: string[];
  name?: string;
  max?: number;
}) {
  const [selected, setSelected] = useState<string[]>(initial);
  const [query, setQuery] = useState('');

  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return options
      .filter(
        (o) =>
          !selected.includes(o.id) &&
          (o.name.toLowerCase().includes(q) || o.aliases.some((a) => a.toLowerCase().includes(q))),
      )
      .slice(0, 8);
  }, [query, options, selected]);

  const add = (id: string) => {
    if (selected.length >= max) return;
    setSelected((s) => [...s, id]);
    setQuery('');
  };

  return (
    <div className="space-y-2">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <label htmlFor="skill-search" className="block text-sm font-medium">
        Skills
      </label>

      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const skill = byId.get(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => setSelected((s) => s.filter((x) => x !== id))}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-3 py-1 text-sm transition-colors duration-[--duration-fast] hover:bg-border-base"
                >
                  {skill?.name ?? id}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove {skill?.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <input
        id="skill-search"
        type="text"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls="skill-results"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          selected.length >= max
            ? `That's the maximum of ${max}`
            : 'Search — try "n8n", "Golang", "WhatsApp"'
        }
        disabled={selected.length >= max}
        className="h-11 w-full rounded-[--radius] border border-border-strong bg-surface-raised px-3 placeholder:text-text-subtle"
      />

      {results.length > 0 && (
        <ul
          id="skill-results"
          className="overflow-hidden rounded-[--radius] border border-border-base bg-surface-raised shadow-sm"
        >
          {results.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => add(o.id)}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm transition-colors duration-[--duration-fast] hover:bg-surface-sunken"
              >
                <span>{o.name}</span>
                <span className="text-xs text-text-subtle">{o.category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-text-muted">
        {selected.length}/{max} · pick the ones you would actually take work in.
      </p>
    </div>
  );
}
