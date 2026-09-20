import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const base =
  'inline-flex items-center justify-center gap-2 rounded-[--radius] font-medium ' +
  // Name the properties. `transition-all` animates layout properties too, which is both
  // slower and a source of jank nobody can find later.
  'transition-[background-color,border-color,color,transform,box-shadow] ' +
  'duration-[--duration-fast] ease-[--ease] ' +
  // Buttons must feel pressed. Without this they read as images of buttons.
  'active:scale-[0.98] ' +
  'disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-text shadow-sm hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface-raised hover:bg-surface-sunken',
  ghost: 'hover:bg-surface-sunken',
  danger: 'bg-danger text-white hover:opacity-90',
};

const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5', lg: 'h-12 px-6 text-lg' };

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant; size?: keyof typeof sizes }) {
  return <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
}
