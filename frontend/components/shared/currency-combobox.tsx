'use client';

import { CaretDown as ChevronDown, MagnifyingGlass as Search } from '@phosphor-icons/react/ssr';
import { useId, useMemo, useState, type KeyboardEvent } from 'react';

import { controlStyles } from '@/components/ui/field';
import { COMMON_CURRENCIES, CURRENCIES } from '@techselect/backend/currencies';
import { cn } from '@/lib/ui/cn';

type Currency = { code: string; name: string; search: string };

const ALL: Currency[] = CURRENCIES.map(([code, name]) => ({
  code,
  name,
  search: `${code} ${name}`.toLowerCase(),
}));
const BY_CODE = new Map(ALL.map((c) => [c.code, c]));
const COMMON = new Set<string>(COMMON_CURRENCIES);
/** With nothing typed: the four the product has always offered, then the rest A to Z. */
const DEFAULT_ORDER = [
  ...COMMON_CURRENCIES.map((code) => BY_CODE.get(code)!).filter(Boolean),
  ...ALL.filter((c) => !COMMON.has(c.code)),
];

/**
 * A searchable currency picker over every currency in circulation (backend/src/currencies.ts). Type a
 * code or a name ("chf", "peso", "dollar") and pick from the matches; the value posted is the
 * three-letter code, in a hidden input named `name`.
 *
 * Same pattern as the time zone picker: a WAI-ARIA 1.2 combobox, focus stays in the input, ↑/↓
 * move the highlighted option, Enter picks it, Escape closes the list. Required, so it always
 * holds a currency (USD unless one was chosen) and cannot be cleared to nothing.
 */
export function CurrencyCombobox({
  defaultValue,
  name = 'currency',
  label = 'Currency',
  errors,
  className,
}: {
  defaultValue?: string;
  name?: string;
  label?: string;
  errors?: string[];
  className?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [value, setValue] = useState(
    defaultValue && BY_CODE.has(defaultValue) ? defaultValue : 'USD',
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return DEFAULT_ORDER;
    const matches = ALL.filter((c) => words.every((w) => c.search.includes(w)));
    // An exact code first: typing "eur" should land on EUR, not on a name containing "eur".
    const q = query.trim().toUpperCase();
    return matches.sort((a, b) => Number(b.code === q) - Number(a.code === q));
  }, [query]);

  const active = open && results.length ? Math.min(highlight, results.length - 1) : -1;
  const selected = BY_CODE.get(value);

  const pick = (c: Currency) => {
    setValue(c.code);
    setQuery('');
    setOpen(false);
    setHighlight(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      else if (results.length) setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === 'ArrowUp' && open && results.length) {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && open) {
      // Choosing a currency, not submitting the whole form.
      e.preventDefault();
      const c = results[active];
      if (c) pick(c);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  const invalid = Boolean(errors?.length);

  return (
    <div className={cn('space-y-1.5', className)}>
      <input type="hidden" name={name} value={value} />
      <label htmlFor={`${uid}-input`} className="block text-sm font-semibold">
        {label}
      </label>

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
          aria-invalid={invalid}
          aria-describedby={invalid ? `${uid}-error` : undefined}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          // While closed, the field shows the chosen currency; typing switches it to a search box.
          value={open ? query : selected ? `${selected.code} · ${selected.name}` : value}
          placeholder={open ? 'Type a code or a name' : 'Choose a currency'}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
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
            'h-11 truncate pr-9 pl-10',
            invalid ? 'border-danger' : 'border-control/70 hover:border-control',
          )}
        />
        <ChevronDown
          aria-hidden="true"
          size={16}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-text-subtle"
        />

        {open && (
          <ul
            id={listId}
            role="listbox"
            aria-label="Currencies"
            className="absolute inset-x-0 top-full z-overlay mt-1.5 max-h-72 min-w-64 overflow-y-auto overscroll-contain rounded-lg border border-border-base bg-surface-raised p-1 shadow-md"
          >
            {results.length === 0 ? (
              <li className="px-3 py-2.5 text-sm text-text-muted">No currency matches that.</li>
            ) : (
              results.map((c, i) => (
                <li
                  key={c.code}
                  id={`${uid}-opt-${i}`}
                  role="option"
                  aria-selected={c.code === value}
                  // mousedown, not click: a click would blur the input and close the list first.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(c);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    'flex cursor-pointer items-baseline gap-3 rounded-md px-3 py-2 text-sm',
                    i === active && 'bg-surface-sunken',
                    c.code === value && 'font-semibold',
                    // A hairline under the common four when the full list is showing.
                    !query &&
                      i === COMMON_CURRENCIES.length - 1 &&
                      'mb-1 border-b border-border-base',
                  )}
                >
                  <span className="w-10 shrink-0 font-mono text-xs tabular-nums">{c.code}</span>
                  <span className="min-w-0 truncate text-text-muted">{c.name}</span>
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
