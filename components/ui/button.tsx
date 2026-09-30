import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The button. One component, one set of variants, and a `buttonStyles()` export so a <Link> can
 * look like a button without being one — a link that navigates must stay a link, or the
 * browser's own behaviour (open in new tab, the status bar URL, prefetch) disappears.
 *
 * SHAPE — the system's subtle 6px radius (`rounded-md`), like every other control.
 *
 * MOTION — `pressable`: scale(0.97) on :active, 100ms, strong ease-out. Answering on
 * pointer-down is what makes a web button feel like a native one (mobile-native §5). Hover is
 * colour only, and Tailwind v4's `hover:` is already gated to devices that can hover, so it never
 * sticks after a tap.
 *
 * SIZES — `md` is 44px, the minimum comfortable touch target. `sm` (36px) is for dense rows on
 * pointer devices and still clears WCAG 2.5.8's 24px floor.
 */
export const buttonStyles = cva(
  [
    'pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-fast ease-out',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** Ink on paper — the default action. Deliberately not the accent: see DESIGN.md §4.1. */
        primary:
          'bg-primary text-primary-text shadow-xs hover:bg-primary-hover active:bg-primary-pressed',
        /** The accent, for the ONE action a screen exists for (publish, apply, send). */
        accent: 'bg-accent text-accent-text shadow-xs hover:bg-accent-hover',
        secondary:
          'border border-control bg-surface-raised text-text shadow-xs hover:bg-surface-sunken',
        ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text',
        danger: 'bg-danger text-primary-text shadow-xs hover:opacity-90',
        /** A destructive action that is not the primary one — "Not a fit", "Delete". */
        'danger-ghost': 'text-danger hover:bg-danger-subtle',
      },
      size: {
        sm: 'h-10 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-[0.9375rem] [&_svg]:size-[1.125rem]',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-[1.125rem]',
        'icon-sm': 'size-10 [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonStyles>;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return (
    <button type={type} className={cn(buttonStyles({ variant, size }), className)} {...props} />
  );
}
