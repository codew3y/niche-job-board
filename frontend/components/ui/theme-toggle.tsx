'use client';

import { Desktop as Monitor, Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/ui/cn';

/**
 * The header toggle: flips between light and dark.
 *
 * The ICON IS CHOSEN BY CSS, not by JavaScript. next-themes writes `data-theme` on <html>
 * before first paint, so `dark:` already knows the answer when the server's HTML arrives.
 * Deciding the icon in React instead means the server (which cannot know the stored theme)
 * renders a guess and the client corrects it — a sun that becomes a moon on load, which is the
 * toggle's own layout shift. An earlier version waited for hydration with a "mounted" flag and
 * showed a placeholder forever, because the flag never flipped.
 *
 * The label is stable ("Toggle theme") for the same reason; the icon shows the state.
 * No animation on the swap: pressed often, and an animated icon reads as delay (frequency rule).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      // resolvedTheme is only read on click, which is always after hydration.
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle dark theme"
      className={cn(
        'pressable grid size-10 place-items-center rounded-md text-text-muted hover:bg-surface-sunken hover:text-text',
        className,
      )}
    >
      <Moon aria-hidden="true" size={18} className="dark:hidden" />
      <Sun aria-hidden="true" size={18} className="hidden dark:block" />
    </button>
  );
}

/**
 * The full choice, for settings: System / Light / Dark as a real radio group. "System" is the
 * one the header toggle cannot express, and it is the right default for most people.
 *
 * Nothing is checked until the component has mounted: the server cannot know the stored theme,
 * and next-themes' own guidance is to wait rather than render a `checked` the client will
 * contradict. The flag is set from an animation frame — after hydration, never during it.
 */
export function ThemeChoice() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

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
              'has-[:checked]:border-primary has-[:checked]:bg-primary-subtle has-[:checked]:text-text',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={mounted && theme === value}
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
