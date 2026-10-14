'use client';

import { ArrowClockwise as RotateCw, Warning as TriangleAlert } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { useEffect } from 'react';

import { reportError } from '@/lib/observability/report-error';

import { Button, buttonStyles } from './button';

/**
 * What a route shows when it throws.
 *
 * Says what happened in plain words, offers the two things that usually work — try again, or
 * go somewhere safe — and never shows the raw error to the visitor. The `digest` is shown so a
 * report can be matched to the server log without leaking the message itself, which on this
 * codebase has, once, contained part of a credential (see the security commits).
 */
export function ErrorState({
  error,
  reset,
  home = '/',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  home?: string;
}) {
  useEffect(() => {
    // The server already logged it; this is for the browser console during development.
    console.error(error);
    // And to error tracking, when it is on: a boundary catches the error, so the browser never
    // reports it as unhandled (lib/observability/report-error.ts).
    reportError(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md py-16 text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid size-12 place-items-center rounded-md bg-danger-subtle text-danger"
      >
        <TriangleAlert size={22} weight="duotone" />
      </span>
      <h1 className="mt-5 font-semibold text-display-sm">Something went wrong</h1>
      <p className="mt-3 text-text-muted text-pretty">
        This page didn&rsquo;t load. It&rsquo;s usually temporary, so try again. Nothing you saved
        is lost.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
        <Link href={home} className={buttonStyles({ variant: 'secondary' })}>
          Go back home
        </Link>
      </div>
      {error.digest && <p className="mt-8 text-xs text-text-subtle">Reference: {error.digest}</p>}
    </div>
  );
}
