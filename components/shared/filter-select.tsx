'use client';

import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/ui/cn';

/**
 * A compact filter control: a native <select> styled as a pill. Native on purpose — on a phone it
 * opens the OS picker, which is faster to use and better with a screen reader than any custom
 * listbox, and filters are used many times per visit.
 *
 * When a value is set the pill turns ink, so the active filters read at a glance without
 * opening each one.
 */
export function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  const active = Boolean(value);
  return (
    <span className="relative inline-flex shrink-0 items-center">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 appearance-none rounded-full border pr-9 pl-4 text-sm font-medium transition-colors duration-fast ease-out',
          active
            ? 'border-surface-inverse bg-surface-inverse text-text-inverse'
            : 'border-control/60 bg-surface-raised text-text-muted hover:border-control hover:text-text',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={15}
        className={cn(
          'pointer-events-none absolute right-3.5',
          active ? 'text-text-inverse' : 'text-text-subtle',
        )}
      />
    </span>
  );
}
