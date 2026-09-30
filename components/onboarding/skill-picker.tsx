'use client';

import { Search, X } from 'lucide-react';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';

import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';

export type SkillOption = { id: string; name: string; category: string; aliases: string[] };

/**
 * Skill picker over the seeded taxonomy (126 skills, 10 categories).
 *
 * Free text is deliberately impossible: every tag resolves to a taxonomy row, which is what
 * keeps filters and matching clean (PROJECT.md §4.6). Search also matches ALIASES, so a client
 * typing "WhatsApp chatbot" finds `WhatsApp Business API` and someone typing "Golang" finds
 * `Go` — that alias bridge is the whole point of the taxonomy's alias policy.
 *
 * A REAL COMBOBOX (WAI-ARIA 1.2). It was labelled `role="combobox"` before and behaved as a text
 * box followed by loose buttons: no arrow keys, and every result was its own tab stop. Now focus
 * stays in the input, ↑/↓ move a highlighted option (`aria-activedescendant`), Enter adds it,
 * Escape closes the list. Mouse and touch still tap an option directly.
 *
 * No animation on the list: it opens on every keystroke, which is the highest-frequency
 * interaction in the form (frequency rule).
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
  const uid = useId();
  const listId = `${uid}-results`;
  const [selected, setSelected] = useState<string[]>(initial);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [announcement, setAnnouncement] = useState('');

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

  const full = selected.length >= max;
  const open = results.length > 0;
  const active = open ? Math.min(highlight, results.length - 1) : -1;

  const add = (id: string) => {
    if (full) return;
    setSelected((s) => [...s, id]);
    setQuery('');
    setHighlight(0);
    setAnnouncement(`${byId.get(id)?.name ?? 'Skill'} added. ${selected.length + 1} of ${max}.`);
  };

  const remove = (id: string) => {
    setSelected((s) => s.filter((x) => x !== id));
    setAnnouncement(`${byId.get(id)?.name ?? 'Skill'} removed.`);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && open) {
      // Adding a skill, not submitting the whole form mid-thought.
      e.preventDefault();
      const option = results[active];
      if (option) add(option.id);
    } else if (e.key === 'Escape' && query) {
      e.preventDefault();
      setQuery('');
    } else if (e.key === 'Backspace' && !query && selected.length > 0) {
      remove(selected[selected.length - 1]!);
    }
  };

  return (
    <div className="space-y-2.5">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}

      <label htmlFor={`${uid}-input`} className="block text-sm font-semibold">
        Skills
      </label>

      {selected.length > 0 && (
        <ul aria-label="Selected skills" className="flex flex-wrap gap-1.5">
          {selected.map((id) => {
            const skill = byId.get(id);
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => remove(id)}
                  className="pressable inline-flex h-8 items-center gap-1.5 rounded-md bg-surface-inverse pr-2 pl-3 text-sm text-text-inverse hover:opacity-85"
                >
                  {skill?.name ?? id}
                  <X aria-hidden="true" size={14} className="opacity-70" />
                  <span className="sr-only">— remove</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="relative">
        <Search
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-subtle"
        />
        <input
          id={`${uid}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          aria-describedby={`${uid}-count`}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          placeholder={
            full ? `That's the maximum of ${max}` : 'Search — try "n8n", "Golang", "WhatsApp"'
          }
          disabled={full}
          className={cn(controlStyles, 'h-11 border-control/70 pr-3.5 pl-10 hover:border-control')}
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Matching skills"
            className="absolute inset-x-0 top-full z-overlay mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border-base bg-surface-raised p-1 shadow-md"
          >
            {results.map((o, i) => (
              <li
                key={o.id}
                id={`${uid}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: a click would blur the input first and close the list
                // before the choice registered.
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(o.id);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={cn(
                  'flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-3 py-2.5 text-sm',
                  i === active ? 'bg-surface-sunken' : '',
                )}
              >
                <span>{o.name}</span>
                <span className="shrink-0 text-xs text-text-subtle">{o.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p id={`${uid}-count`} className="text-sm text-text-subtle">
        {selected.length}/{max} · pick the ones you would actually take work in.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
