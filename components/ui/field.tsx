import type { ComponentProps, ReactNode } from 'react';

/**
 * A labelled input with inline errors.
 *
 * Errors are wired with `aria-describedby` and `aria-invalid` rather than styled red and left
 * at that — colour alone is not an error message for a screen reader, and red alone is not
 * one for a colour-blind user (§9).
 */
export function Field({
  label,
  name,
  errors,
  hint,
  children,
  ...props
}: ComponentProps<'input'> & { label: string; name: string; errors?: string[]; hint?: ReactNode }) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;
  const invalid = Boolean(errors?.length);

  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      {children ?? (
        <input
          id={name}
          name={name}
          aria-invalid={invalid}
          aria-describedby={`${hint ? hintId : ''} ${invalid ? errorId : ''}`.trim() || undefined}
          className={`h-11 w-full rounded-[--radius] border bg-surface-raised px-3
            transition-[border-color,box-shadow] duration-[--duration-fast] ease-[--ease]
            placeholder:text-text-subtle
            ${invalid ? 'border-danger' : 'border-border-strong'}`}
          {...props}
        />
      )}
      {hint && !invalid && (
        <p id={hintId} className="text-sm text-text-muted">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={errorId} className="text-sm text-danger">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
