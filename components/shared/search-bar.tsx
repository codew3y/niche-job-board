'use client';

import { Loader2, Search, X } from 'lucide-react';

import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';

/**
 * The browse search box. `enterkeyhint="search"` so a phone's return key says Search, and a
 * clear button once there is something to clear. The spinner is the one place a spinner is
 * right: a query is running and there is no content shape to hold with a skeleton yet.
 */
export function SearchBar({
  id,
  label,
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder,
  pending,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  placeholder: string;
  pending: boolean;
}) {
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="relative"
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      {pending ? (
        <Loader2
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 animate-spin text-text-subtle motion-reduce:animate-none"
        />
      ) : (
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-subtle"
        />
      )}
      <input
        id={id}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          controlStyles,
          'h-12 rounded-md border-control/70 pr-12 pl-11 hover:border-control [&::-webkit-search-cancel-button]:hidden',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="pressable absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-text-subtle hover:bg-surface-sunken hover:text-text"
        >
          <X aria-hidden="true" size={16} />
        </button>
      )}
    </form>
  );
}
