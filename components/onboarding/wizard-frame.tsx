import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { Logo } from '@/components/layout/logo';
import { logoHref } from '@/lib/roles';
import { cn } from '@/lib/ui/cn';

type Step = { slug: string; title: string; blurb: string };

/**
 * Wizard chrome: a progress rail plus the current step's form.
 *
 * `done` is derived from saved data, not from a counter (see lib/onboarding/steps.ts). A
 * completed step stays clickable so someone can go back and fix a typo; a future step does not,
 * because its form would have nothing to build on.
 *
 * ONE RAIL AT EVERY WIDTH. Each step is a segment with a numbered tile under it. On a phone the
 * names are kept for screen readers only, because four names do not fit at 360px without
 * shrinking past reading, and the current one is the page's h1 directly below; from `sm` up
 * every name is visible. The state of a step is carried by shape and text as well as colour: a check
 * for complete, a number otherwise, the bold name and `aria-current="step"` for the current one.
 *
 * Every reachable step is a real link, so the rail is keyboard navigable, and each link is at
 * least 40px tall for touch. Nothing animates: the rail changes once per step, on a page load.
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
  const previous = index > 0 ? steps[index - 1] : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="border-b border-border-base bg-surface-raised">
        <div className="gutter mx-auto flex min-h-16 w-full max-w-3xl items-center pt-[env(safe-area-inset-top,0px)]">
          {/* Onboarding is always signed in, so the logo goes to the app home, which sends an
              unfinished account straight back here. */}
          <Logo href={logoHref(true)} />
        </div>
      </header>

      <main id="main" className="gutter mx-auto w-full max-w-3xl flex-1 py-8 sm:py-12">
        <nav aria-label="Onboarding progress" className="mb-10">
          {/* Said out loud, and near the top: it removes the "will I lose this?" hesitation that
              makes people rush a long form. */}
          <p className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="font-semibold text-text">
              Step {index + 1} of {steps.length}
            </span>
            <span className="text-text-subtle">Saved as you go</span>
          </p>

          <ol
            className="grid gap-2 sm:gap-3"
            style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
          >
            {steps.map((s, i) => {
              const isCurrent = s.slug === current;
              const complete = done(s.slug);
              const reachable = complete || i <= index;
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-1.5 rounded-sm',
                      isCurrent ? 'bg-accent' : complete ? 'bg-primary' : 'bg-border-strong',
                    )}
                  />
                  <span className="mt-2.5 flex min-w-0 items-center gap-2 text-sm">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md text-xs font-semibold tabular-nums',
                        isCurrent
                          ? 'bg-primary text-primary-text'
                          : complete
                            ? 'bg-success-subtle text-success'
                            : 'border border-control text-text-subtle',
                      )}
                    >
                      {complete && !isCurrent ? <Check size={14} strokeWidth={2.5} /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 truncate',
                        // Phone: names stay for screen readers only. The current one is the h1
                        // right below, so nothing is lost on screen.
                        'max-sm:sr-only',
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
                <li key={s.slug} className="min-w-0">
                  {reachable && !isCurrent ? (
                    <Link
                      href={`${basePath}/${s.slug}`}
                      className="group block min-h-10 rounded-md pb-1"
                    >
                      {body}
                    </Link>
                  ) : (
                    <span
                      className="block min-h-10 pb-1"
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <header className="mb-8">
          {previous && (
            <Link
              href={`${basePath}/${previous.slug}`}
              className="-ml-2 mb-3 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
            >
              <ArrowLeft aria-hidden="true" size={16} />
              Back to {previous.title}
            </Link>
          )}
          <h1 className="font-display text-display-sm text-balance">{step?.title}</h1>
          <p className="mt-2 max-w-xl text-text-muted text-pretty">{step?.blurb}</p>
        </header>

        {children}
      </main>
    </div>
  );
}
