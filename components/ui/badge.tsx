import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * A small status or category label. Every tone pairs a text-safe foreground with a quiet
 * background, and every pair is measured above 4.5:1 in both themes (DESIGN.md §4.1) — a badge
 * is text, so it gets the text standard, not the "it's only a label" one.
 */
export const badgeStyles = cva(
  'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-sunken text-text-muted',
        accent: 'bg-accent-subtle text-accent',
        success: 'bg-success-subtle text-success',
        warning: 'bg-warning-subtle text-warning',
        danger: 'bg-danger-subtle text-danger',
        outline: 'border border-border-strong text-text-muted',
        ink: 'bg-surface-inverse text-text-inverse',
      },
      size: {
        sm: 'h-6 px-2.5 text-xs',
        md: 'h-7 px-3 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

export function Badge({
  tone,
  size,
  className,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeStyles>) {
  return <span className={cn(badgeStyles({ tone, size }), className)} {...props} />;
}

/** A list of skill tags. `required` renders the first N in ink so a scan finds them first. */
export function TagList({
  tags,
  label,
  className,
}: {
  tags: { name: string; strong?: boolean }[];
  label?: string;
  className?: string;
}) {
  if (tags.length === 0) return null;
  return (
    <ul aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((t) => (
        <li key={t.name}>
          <Badge tone={t.strong ? 'outline' : 'neutral'} className={t.strong ? 'text-text' : ''}>
            {t.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
