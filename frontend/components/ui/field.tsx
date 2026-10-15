import { CaretDown } from '@phosphor-icons/react/ssr';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * Form controls: the input, textarea and select every form uses, plus the label / hint / error
 * shell around them.
 *
 * There used to be eleven hand-written textarea variants across the app, each
 * with its own border, padding and error handling. There is now one of each control.
 *
 * ACCESSIBILITY — errors are wired with `aria-describedby` and `aria-invalid`, not only coloured
 * red: colour alone is not an error message for a screen reader, and red alone is not one for a
 * colour-blind reader. The error replaces the hint rather than stacking under it, so the field
 * never grows two lines of small print at the moment the user is already confused.
 *
 * MOBILE — the control font is 16px (globals.css), so iOS never zooms in on focus.
 */

/** The shared control surface. Exported for the few controls that are not a Field (search). */
export const controlStyles = cn(
  'w-full rounded-md border bg-surface-raised text-text placeholder:text-text-subtle',
  'transition-[border-color,box-shadow] duration-fast ease-out',
  'focus-visible:focus-halo focus-visible:border-focus focus-visible:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

const border = (invalid: boolean) =>
  invalid ? 'border-danger' : 'border-control hover:border-text-subtle';

type ShellProps = {
  label: ReactNode;
  name: string;
  /** Overrides `name` as the element id when two fields in one page share a name. */
  id?: string;
  errors?: string[];
  hint?: ReactNode;
  optional?: boolean;
  /** Hide the label visually (it stays in the accessibility tree). */
  srOnlyLabel?: boolean;
  className?: string;
  children: (a11y: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
};

export function FieldShell({
  label,
  name,
  id,
  errors,
  hint,
  optional,
  srOnlyLabel,
  className,
  children,
}: ShellProps) {
  const fieldId = id ?? name;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const invalid = Boolean(errors?.length);
  const describedBy = invalid ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={fieldId}
        className={cn('block text-sm font-medium text-text', srOnlyLabel && 'sr-only')}
      >
        {label}
        {optional && <span className="ml-1.5 font-normal text-text-subtle">Optional</span>}
      </label>
      {children({ id: fieldId, 'aria-invalid': invalid, 'aria-describedby': describedBy })}
      {invalid ? (
        <p id={errorId} className="flex gap-1.5 text-sm text-danger">
          {errors![0]}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = {
  label: ReactNode;
  name: string;
  errors?: string[];
  hint?: ReactNode;
  optional?: boolean;
  srOnlyLabel?: boolean;
  wrapperClassName?: string;
};

/** A labelled text input. Same props as before the rebuild, so every call site kept working. */
export function Field({
  label,
  name,
  id,
  errors,
  hint,
  optional,
  srOnlyLabel,
  wrapperClassName,
  className,
  children,
  ...props
}: ComponentProps<'input'> & Common) {
  return (
    <FieldShell
      label={label}
      name={name}
      id={id}
      errors={errors}
      hint={hint}
      optional={optional}
      srOnlyLabel={srOnlyLabel}
      className={wrapperClassName}
    >
      {(a11y) =>
        children ?? (
          <input
            name={name}
            {...a11y}
            className={cn(controlStyles, border(a11y['aria-invalid']), 'h-11 px-3.5', className)}
            {...props}
          />
        )
      }
    </FieldShell>
  );
}

export function TextareaField({
  label,
  name,
  id,
  errors,
  hint,
  optional,
  srOnlyLabel,
  wrapperClassName,
  className,
  rows = 4,
  ...props
}: ComponentProps<'textarea'> & Common) {
  return (
    <FieldShell
      label={label}
      name={name}
      id={id}
      errors={errors}
      hint={hint}
      optional={optional}
      srOnlyLabel={srOnlyLabel}
      className={wrapperClassName}
    >
      {(a11y) => (
        <textarea
          name={name}
          rows={rows}
          {...a11y}
          className={cn(
            controlStyles,
            border(a11y['aria-invalid']),
            'min-h-24 px-3.5 py-3 leading-relaxed',
            className,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  name,
  id,
  errors,
  hint,
  optional,
  srOnlyLabel,
  wrapperClassName,
  className,
  children,
  ...props
}: ComponentProps<'select'> & Common) {
  return (
    <FieldShell
      label={label}
      name={name}
      id={id}
      errors={errors}
      hint={hint}
      optional={optional}
      srOnlyLabel={srOnlyLabel}
      className={wrapperClassName}
    >
      {(a11y) => (
        // The chevron is an icon in the token colour, not a data-URI SVG: a hard-coded stroke
        // colour cannot follow the theme, and would sit grey-on-grey in dark mode.
        <div className="relative">
          <select
            name={name}
            {...a11y}
            className={cn(
              controlStyles,
              border(a11y['aria-invalid']),
              'h-11 appearance-none pr-10 pl-3.5',
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <CaretDown
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-text-subtle"
          />
        </div>
      )}
    </FieldShell>
  );
}

/**
 * Pill radios — engagement type, location, availability. A real radio group underneath (arrow
 * keys move between options, one tab stop), styled as chips. The input is visually hidden but
 * focusable, and the chip draws the focus ring for it with `has-[:focus-visible]`.
 */
export function ChoiceChips({
  legend,
  name,
  options,
  defaultValue,
  value,
  onChange,
  hint,
}: {
  legend: string;
  name: string;
  options: readonly (readonly [string, string])[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  hint?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, l]) => (
          <label
            key={v}
            className={cn(
              'pressable relative inline-flex h-10 cursor-pointer items-center rounded-md border px-4 text-sm select-none',
              'border-control bg-surface-raised text-text-muted hover:bg-surface-sunken hover:text-text',
              'has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-text',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            )}
          >
            <input
              type="radio"
              name={name}
              value={v}
              {...(value !== undefined
                ? { checked: value === v, onChange: () => onChange?.(v) }
                : { defaultChecked: defaultValue === v })}
              className="sr-only"
            />
            {l}
          </label>
        ))}
      </div>
      {hint && <p className="mt-2 text-sm text-text-subtle">{hint}</p>}
    </fieldset>
  );
}

/** A form-level error — the message an action returns when no single field is at fault. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-danger-subtle px-3.5 py-3 text-sm text-danger">
      {children}
    </p>
  );
}

/** A form-level confirmation, announced politely. */
export function FormStatus({ children }: { children: ReactNode }) {
  return (
    <p role="status" aria-live="polite" className="text-sm text-success">
      {children}
    </p>
  );
}
