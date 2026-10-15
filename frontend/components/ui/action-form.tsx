'use client';

import type { ReactNode } from 'react';
import { toast } from 'sonner';

/**
 * A form that runs a server action and confirms it with a toast.
 *
 * For the actions whose result has no natural home on screen — publishing a profile, closing a
 * job, switching role, withdrawing an application. The page re-renders to the new state either
 * way (the actions revalidate), but a state change you did not watch happen is easy to miss, and
 * a toast is the one-line "that worked" (ask-sonner: `toast()` is client-only, so the server
 * action returns and the client announces).
 *
 * NOT used for form saves that already confirm inline ("Saved." beside the button): two
 * announcements of the same event is noise, and screen readers would hear both.
 *
 * The form action is itself async: React runs an async form action inside a transition, so a
 * submit button's `useFormStatus()` stays pending until the server action settles — exactly as
 * it would on a plain `<form action>`.
 */
export function ActionForm({
  action,
  success,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<unknown>;
  /** The confirmation. Omit for a silent action. */
  success?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <form
      className={className}
      action={async (formData) => {
        try {
          await action(formData);
          if (success) toast.success(success);
        } catch (error) {
          // redirect() and notFound() throw on purpose — they are navigation, not failure.
          if (isNavigation(error)) throw error;
          toast.error('That did not work. Please try again.');
        }
      }}
    >
      {children}
    </form>
  );
}

function isNavigation(error: unknown) {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === 'string' &&
    /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK)/.test(digest)
  );
}
