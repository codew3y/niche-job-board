import type { ReactNode } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The page title on an app screen: the largest type on the screen, in Geist like everything else
 * (hierarchy from size and weight, not a second face). An optional eyebrow sits above it in the
 * mono face, sentence case, never the uppercase tracked label taste-skill counts as a tell.
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
      className={cn('mb-10 flex flex-wrap items-end justify-between gap-x-6 gap-y-4', className)}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="mb-3 font-mono text-xs text-text-subtle">{eyebrow}</p>}
        <h1 className="text-display-sm">{title}</h1>
        {subtitle && <div className="mt-3 max-w-[60ch] text-text-muted">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** A section heading inside a page: one step below the page title. */
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-text-subtle">{description}</p>}
      </div>
      {action}
    </div>
  );
}
