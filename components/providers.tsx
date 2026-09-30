'use client';

import { ThemeProvider, useTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

/**
 * App-wide client providers: theme and toasts.
 *
 * THEME — next-themes writes `data-theme` on <html> before first paint (an inline script), so
 * there is no flash of the wrong theme. "System" is the default: the OS setting is the most
 * honest signal of what someone wants until they say otherwise. `disableTransitionOnChange`
 * stops every colour transition in the app firing at once on a theme switch, which reads as the
 * page melting rather than changing.
 *
 * TOASTS — ONE Toaster, mounted here once (ask-sonner: a second one duplicates every toast).
 * Themed from the resolved theme, because Sonner defaults to light and does not follow the OS.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <ThemedToaster />
    </ThemeProvider>
  );
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
      // Bottom-right, clear of the sidebar and out of the reading column.
      position="bottom-right"
      mobileOffset={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            '!rounded-lg !border !border-border-base !bg-surface-raised !text-text !shadow-lg !font-sans',
          title: '!font-semibold',
          description: '!text-text-muted',
          actionButton: '!rounded-md !bg-primary !text-primary-text',
          cancelButton: '!rounded-md !bg-surface-sunken !text-text',
          success: '[&_[data-icon]]:!text-success',
          error: '[&_[data-icon]]:!text-danger',
          warning: '[&_[data-icon]]:!text-warning',
          info: '[&_[data-icon]]:!text-info',
        },
      }}
    />
  );
}
