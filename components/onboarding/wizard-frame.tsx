import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/layout/logo';
import { logoHref } from '@/lib/roles';
import { cn } from '@/lib/ui/cn';

type Step = { slug: string; title: string; blurb: string };

/**
 * Wizard chrome: a progress rail plus the current step's form.
 *
 * `done` is derived from saved data, not from a counter — see lib/onboarding/steps.ts. A
 * completed step stays clickable so someone can go back and fix a typo; a future step does not,
 * because its form would have nothing to build on.
 *
 * On a phone the rail collapses to "Step 2 of 4" and a bar — four labelled dots do not fit at
 * 320px without shrinking the labels past reading. The bar's width is a static style, not an
 * animation: it changes once per step, on a page load, where motion would only delay the form.
 */
export function WizardFrame({
  steps,
  current,
  done,
  basePath,
  children,
}: {
  steps: readonly Step[];
  current: string;
  done: (slug: string) => boolean;
  basePath: string;
  children: ReactNode;
}) {
  const index = steps.findIndex((s) => s.slug === current);
  const step = steps[index];
  const progress = ((index + 1) / steps.length) * 100;

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="gutter mx-auto flex w-full max-w-3xl items-center justify-between gap-4 pt-[max(1.25rem,env(safe-area-inset-top,0px))]">
        {/* Onboarding is always signed in, so the logo goes to the app home — which sends an
            unfinished account straight back here. */}
        <Logo href={logoHref(true)} />
        {/* Said out loud, and near the top: it removes the "will I lose this?" hesitation that
            makes people rush a long form. */}
        <p className="hidden text-sm text-text-subtle sm:block">Saved as you go</p>
      </div>

      <main id="main" className="gutter mx-auto w-full max-w-3xl flex-1 py-8 sm:py-12">
        <nav aria-label="Progress" className="mb-10">
          <p className="mb-3 flex items-baseline justify-between text-sm sm:hidden">
            <span className="font-semibold">
              Step {index + 1} of {steps.length}
            </span>
            <span className="text-text-subtle">Saved as you go</span>
          </p>
          <div
            className="h-1 overflow-hidden rounded-full bg-surface-sunken sm:hidden"
            aria-hidden="true"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${progress}%` }} />
          </div>

          <ol className="hidden grid-flow-col gap-3 sm:grid">
            {steps.map((s, i) => {
              const isCurrent = s.slug === current;
              const complete = done(s.slug);
              const reachable = complete || i <= index;
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-1 rounded-full',
                      isCurrent
                        ? 'bg-accent'
                        : complete
                          ? 'bg-surface-inverse'
                          : 'bg-surface-sunken',
                    )}
                  />
                  <span className="mt-3 flex items-center gap-1.5 text-sm">
                    {complete && !isCurrent ? (
                      <Check aria-hidden="true" size={14} className="text-success" />
                    ) : (
                      <span aria-hidden="true" className="text-text-subtle tabular-nums">
                        {i + 1}
                      </span>
                    )}
                    <span
                      className={cn(
                        isCurrent
                          ? 'font-semibold text-text'
                          : complete
                            ? 'text-text-muted group-hover:text-text'
                            : 'text-text-subtle',
                      )}
                    >
                      {s.title}
                    </span>
                    <span className="sr-only">
                      {isCurrent ? '(current step)' : complete ? '(complete)' : '(not started)'}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={s.slug}>
                  {reachable && !isCurrent ? (
                    <Link href={`${basePath}/${s.slug}`} className="group block rounded-sm">
                      {body}
                    </Link>
                  ) : (
                    <span className="block" aria-current={isCurrent ? 'step' : undefined}>
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="sr-only">
            Step {index + 1} of {steps.length}: {step?.title}
          </p>
        </nav>

        <header className="mb-8">
          <h1 className="font-semibold text-display-sm text-balance">{step?.title}</h1>
          <p className="mt-2 max-w-xl text-text-muted text-pretty">{step?.blurb}</p>
        </header>

        {children}
      </main>
    </div>
  );
}
