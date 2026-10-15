'use client';

import { CaretDown as ChevronDown, MagnifyingGlass as Search, X } from '@phosphor-icons/react/ssr';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { controlStyles } from '@/components/ui/field';
import { TIME_ZONES } from '@techselect/backend/timezones';
import { cn } from '@/lib/ui/cn';

type Zone = { id: string; city: string; region: string; offset: string; search: string };

/** "UTC+2", "UTC-3:30", "UTC" — the zone's offset right now, so the list reflects DST today. */
function offsetOf(zone: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    return (part ?? 'GMT').replace('GMT', 'UTC');
  } catch {
    return '';
  }
}

function describe(id: string): Zone {
  const parts = id.split('/');
  const city = (parts.at(-1) ?? id).replace(/_/g, ' ');
  const region = parts.length > 1 ? parts.slice(0, -1).join(' / ').replace(/_/g, ' ') : '';
  const offset = offsetOf(id);
  return { id, city, region, offset, search: `${id} ${city} ${region} ${offset}`.toLowerCase() };
}

/**
 * A searchable time zone picker over every IANA zone (backend/src/timezones.ts). Type a city, a region
 * or an offset ("zurich", "asia", "utc+8") and pick from the matches. The value posted is the IANA
 * id, e.g. "Europe/Zurich", in a hidden input named `name`.
 *
 * A WAI-ARIA 1.2 combobox, like the skill picker: focus stays in the input, ↑/↓ move the
 * highlighted option (aria-activedescendant), Enter picks it, Escape closes the list. Mouse and
 * touch pick an option directly. It can be cleared, because the field is optional.
 *
 * Offsets are computed in the browser when the list first opens, so they show today's offset,
 * daylight saving included, without the server and browser having to agree on the date.
 */
export function TimezoneCombobox({
  defaultValue = '',
  name = 'timezone',
  label = 'Time zone',
  errors,
}: {
  defaultValue?: string;
  name?: string;
  label?: string;
  errors?: string[];
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  // Built on first open, not on render: 400-odd Intl calls are cheap once, wasteful per page load.
  const [zones, setZones] = useState<Zone[] | null>(null);
  const ensureZones = () => {
    if (!zones) setZones(TIME_ZONES.map(describe));
  };

  const results = useMemo(() => {
    if (!zones) return [];
    const q = query.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const matches = words.length
      ? zones.filter((z) => words.every((w) => z.search.includes(w)))
      : zones;
    return matches.slice(0, 60);
  }, [zones, query]);

  const active = open && results.length ? Math.min(highlight, results.length - 1) : -1;
  const selected = value ? describe(value) : null;

  const pick = (zone: Zone) => {
    setValue(zone.id);
    setQuery('');
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      ensureZones();
      if (!open) setOpen(true);
      else if (results.length) setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && open && results.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && open) {
      // Choosing a zone, not submitting the whole form.
      e.preventDefault();
      const zone = results[active];
      if (zone) pick(zone);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  const invalid = Boolean(errors?.length);

  return (
    <div className="space-y-1.5">
      <input type="hidden" name={name} value={value} />
      <label htmlFor={`${uid}-input`} className="block text-sm font-semibold">
        {label} <span className="ml-1.5 font-normal text-text-subtle">Optional</span>
      </label>

      <div className="relative">
        <Search
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-text-subtle"
        />
        <input
          ref={inputRef}
          id={`${uid}-input`}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${uid}-opt-${active}` : undefined}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${uid}-error` : undefined}
          autoComplete="off"
          spellCheck={false}
          // While closed, the field shows the chosen zone; typing switches it to a search box.
          value={
            open
              ? query
              : selected
                ? `${selected.city}${selected.region ? `, ${selected.region}` : ''}`
                : ''
          }
          placeholder={open ? 'Search a city, region or offset' : 'Choose your time zone'}
          onFocus={() => {
            ensureZones();
            setOpen(true);
          }}
          onClick={() => {
            ensureZones();
            setOpen(true);
          }}
          onChange={(e) => {
            ensureZones();
            setOpen(true);
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onBlur={() => {
            setOpen(false);
            setQuery('');
          }}
          onKeyDown={onKeyDown}
          className={cn(
            controlStyles,
            'h-11 pr-16 pl-10',
            invalid ? 'border-danger' : 'border-control/70 hover:border-control',
          )}
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-0.5">
          {value && !open && (
            <button
              type="button"
              aria-label="Clear time zone"
              // mousedown, so the input does not blur and reopen around the click.
              onMouseDown={(e) => {
                e.preventDefault();
                setValue('');
              }}
              className="grid size-8 place-items-center rounded-md text-text-subtle hover:bg-surface-sunken hover:text-text"
            >
              <X aria-hidden="true" size={15} />
            </button>
          )}
          {selected && !open && (
            <span className="pr-1 text-xs text-text-subtle tabular-nums">{selected.offset}</span>
          )}
          {!selected && (
            <ChevronDown aria-hidden="true" size={16} className="mr-1.5 text-text-subtle" />
          )}
        </div>

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Time zones"
            className="absolute inset-x-0 top-full z-overlay mt-1.5 max-h-72 overflow-y-auto overscroll-contain rounded-lg border border-border-base bg-surface-raised p-1 shadow-md"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-text-muted">No time zone matches that.</li>
            ) : (
              results.map((z, i) => (
                <li
                  key={z.id}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={z.id === value}
                  // mousedown, not click: a click would blur the input and close the list first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(z);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex cursor-pointer items-baseline justify-between gap-3 rounded-md px-3 py-2 text-sm',
                    i === active && 'bg-surface-sunken',
                    z.id === value && 'font-semibold',
                  )}
                >
                  <span className="min-w-0 truncate">
                    {z.city}
                    {z.region && <span className="text-text-subtle">, {z.region}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-text-subtle tabular-nums">{z.offset}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {invalid && (
        <p id={`${uid}-error`} className="text-sm text-danger">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
