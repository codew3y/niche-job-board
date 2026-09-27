'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/ui/cn';

const noop = () => () => {};
/** True only after hydration — the server cannot know the stored theme. */
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

/**
 * The header toggle: flips between light and dark.
 *
 * Before hydration the server cannot know the stored theme, so the button renders a neutral icon
 * rather than guessing and then correcting itself — a sun that turns into a moon on load is the
 * theme toggle's version of a layout shift. No animation on the icon: this is pressed often and
 * an animated swap reads as delay (frequency rule).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const dark = mounted && resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      aria-label={mounted ? `Switch to ${dark ? 'light' : 'dark'} theme` : 'Toggle theme'}
      className={cn(
        'pressable grid size-10 place-items-center rounded-full text-text-muted hover:bg-surface-sunken hover:text-text',
        className,
      )}
    >
      {!mounted ? (
        <Monitor aria-hidden="true" size={18} />
      ) : dark ? (
        <Sun aria-hidden="true" size={18} />
      ) : (
        <Moon aria-hidden="true" size={18} />
      )}
    </button>
  );
}

/**
 * The full choice, for settings: System / Light / Dark as a real radio group. "System" is the
 * one the header toggle cannot express, and it is the right default for most people.
 */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? (theme ?? 'system') : undefined;

  return (
    <fieldset>
      <legend className="sr-only">Theme</legend>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['system', 'System', Monitor],
            ['light', 'Light', Sun],
            ['dark', 'Dark', Moon],
          ] as const
        ).map(([value, label, Icon]) => (
          <label
            key={value}
            className={cn(
              'pressable flex cursor-pointer flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm select-none',
              'border-border-base bg-surface-raised text-text-muted hover:border-border-strong',
              'has-[:checked]:border-surface-inverse has-[:checked]:text-text',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={current === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon aria-hidden="true" size={20} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
