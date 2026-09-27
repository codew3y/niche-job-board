import type { ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The page title. This is the ONE serif moment on an app screen (DESIGN.md §3.1): the display
 * face announces where you are, and everything below it is working UI in the sans.
 */
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn('mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && (
          <p className="mb-2 text-xs font-medium tracking-eyebrow text-text-subtle uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-display-sm text-balance">{title}</h1>
        {subtitle && <div className="mt-2 text-text-muted text-pretty">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A section heading inside a page — sans, because it is structure, not a title moment. */
export function SectionHeading({
  title,
  description,
  action,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
