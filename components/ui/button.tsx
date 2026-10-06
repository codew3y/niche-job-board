import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The button. One component, one set of variants, and a `buttonStyles()` export so a <Link> can
 * look like a button without being one — a link that navigates must stay a link, or the
 * browser's own behaviour (open in new tab, the status bar URL, prefetch) disappears.
 *
 * SHAPE: 6px corners (`rounded-md`), like every other control, and flat: no shadow on any
 * variant (minimalist-ui 5). Never a pill: pills are for tags.
 *
 * MOTION: `pressable`, scale(0.98) at pointer-down, released on a spring (globals.css). Hover is
 * a colour shift only, and Tailwind v4's `hover:` is already gated to devices that can hover, so
 * it never sticks after a tap.
 *
 * SIZES — `md` is 44px, the minimum comfortable touch target. `sm` (36px) is for dense rows on
 * pointer devices and still clears WCAG 2.5.8's 24px floor.
 */
export const buttonStyles = cva(
  [
    'pressable inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap',
    'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
    '[&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        /** The brand blue: the default action. */
        primary: 'bg-primary text-primary-text hover:bg-primary-hover active:bg-primary-pressed',
        /** The accent, for the ONE action a screen exists for (publish, apply, send). */
        accent: 'bg-accent text-accent-text hover:bg-accent-hover',
        secondary: 'border border-control bg-surface-raised text-text hover:bg-surface-sunken',
        /** The primary action set ON the brand colour (the closing band): the colours swapped. */
        inverse: 'bg-primary-text text-primary hover:bg-primary-text/90 active:bg-primary-text/80',
        /** The second action on the brand colour: an outline in the band's text colour. */
        'inverse-outline':
          'border border-primary-text/50 text-primary-text hover:bg-primary-text/10 active:bg-primary-text/15',
        ghost: 'text-text-muted hover:bg-surface-sunken hover:text-text',
        danger: 'bg-danger text-primary-text hover:opacity-90',
        /** A destructive action that is not the primary one — "Not a fit", "Delete". */
        'danger-ghost': 'text-danger hover:bg-danger-subtle',
      },
      size: {
        sm: 'h-10 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-base [&_svg]:size-4.5',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'size-10 [&_svg]:size-4.5',
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
