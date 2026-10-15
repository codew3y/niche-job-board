'use client';

import { CaretDown as ChevronDown } from '@phosphor-icons/react/ssr';

import { cn } from '@/lib/ui/cn';

/**
 * A compact filter control: a native <select> styled as a chip-height control. Native on purpose:
 * on a phone it opens the OS picker, which is faster to use and better with a screen reader than
 * any custom listbox, and filters are used many times per visit.
 *
 * When a value is set the control fills navy (`bg-primary`), so the active filters read at a
 * glance without opening each one. The chevron and text swap with it, so the state is carried by
 * fill, weight AND the visible value ("Skill: any" vs "React"), never by colour alone.
 *
 * LAYOUT: the wrapper is `flex` and the select `w-full`, so a parent grid decides the width. On a
 * phone the browse filters sit in a two-column grid (every control a full cell, a 40px target);
 * from `sm` they flow as a wrapping row and each control sizes to its content.
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
    <span className={cn('relative flex min-w-0 items-center', className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'h-10 w-full min-w-0 appearance-none truncate rounded-md border pr-9 pl-3.5 text-sm transition-colors duration-fast ease-out sm:w-auto sm:max-w-56',
          active
            ? 'border-primary bg-primary font-semibold text-primary-text hover:bg-primary-hover'
            : 'border-control bg-surface-raised font-medium text-text hover:bg-surface-sunken',
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        size={15}
        className={cn(
          'pointer-events-none absolute right-3',
          active ? 'text-primary-text' : 'text-text-muted',
        )}
      />
    </span>
  );
}
