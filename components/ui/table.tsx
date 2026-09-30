import type { ComponentProps } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * A real <table> for tabular data, with the header row sticky and a horizontal scroll container
 * as the narrow-screen answer — a deliberate, labelled scroll region rather than content
 * clipped off the edge (e2e/responsive.spec.ts treats `overflow-x: auto` as the legitimate
 * choice it is).
 *
 * For lists that are really cards on a phone (jobs, applicants), prefer a list; a table is for
 * rows a reader compares column by column.
 */
export function Table({ className, label, ...props }: ComponentProps<'table'> & { label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-lg border border-border-base bg-surface-raised focus-visible:outline-offset-0"
    >
      <table className={cn('w-full border-collapse text-sm', className)} {...props} />
    </div>
  );
}

export function THead(props: ComponentProps<'thead'>) {
  return <thead className="bg-surface-sunken text-left text-text-muted" {...props} />;
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope="col"
      className={cn(
        'px-4 py-2.5 text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
  return (
    <td className={cn('border-t border-border-base px-4 py-3.5 align-top', className)} {...props} />
  );
}
