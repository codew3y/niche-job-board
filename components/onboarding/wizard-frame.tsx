import { ArrowLeft, Check } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

import { Logo } from '@/components/layout/logo';
import { CONTAINER } from '@/components/site/page-parts';
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
 * ONE RAIL, TWO ORIENTATIONS (the same <ol>, so there is one source of truth):
 *   - below `lg`, a row of segments above the form, each with a numeral; the names are kept for
 *     screen readers only on phones, because four names do not fit at 360px, and the current one
 *     is the page's h1 directly below;
 *   - from `lg`, a vertical list in a left column beside the form, every name visible, the
 *     state shown by a 2px rule on the left of each step.
 * The state of a step is carried by shape and text as well as colour: a check for complete, a
 * numeral otherwise, the heavier name and `aria-current="step"` for the current one.
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
    <div className="flex min-h-dvh flex-col">
      {/* The site's floating bar, without the page links: onboarding is a task, not a browse. */}
      <header className="pt-[calc(env(safe-area-inset-top,0px)+0.75rem)]">
        <div className={CONTAINER}>
          <div className="flex h-15 items-center justify-between gap-4 rounded-lg border border-border-base bg-surface-raised pr-4 pl-4 shadow-sm">
            {/* Onboarding is always signed in, so the logo goes to the app home, which sends an
                unfinished account straight back here. */}
            <Logo href={logoHref(true)} />
            {/* Said out loud, and near the top: it removes the "will I lose this?" hesitation
                that makes people rush a long form. */}
            <p className="font-mono text-xs text-text-subtle">Saved as you go</p>
          </div>
        </div>
      </header>

      <main
        id="main"
        className={cn(
          CONTAINER,
          'grid flex-1 content-start gap-10 py-10 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-16',
        )}
      >
        <nav aria-label="Onboarding progress" className="lg:col-span-3">
          <p className="mb-4 font-mono text-xs text-text-subtle">
            Step {index + 1} of {steps.length}
          </p>

          <ol
            style={{ '--steps': steps.length } as CSSProperties}
            className="grid grid-cols-[repeat(var(--steps),minmax(0,1fr))] gap-2 sm:gap-3 lg:grid-cols-1 lg:gap-1"
          >
            {steps.map((s, i) => {
              const isCurrent = s.slug === current;
              const complete = done(s.slug);
              const reachable = complete || i <= index;
              const tone = isCurrent ? 'accent' : complete ? 'done' : 'todo';
              const body = (
                <span
                  className={cn(
                    'block lg:border-l-2 lg:py-2.5 lg:pl-4',
                    tone === 'accent'
                      ? 'lg:border-accent'
                      : tone === 'done'
                        ? 'lg:border-primary'
                        : 'lg:border-border-strong',
                  )}
                >
                  {/* The segment, below `lg` only; from `lg` the left rule takes its place. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      'block h-1 rounded-sm lg:hidden',
                      tone === 'accent'
                        ? 'bg-accent'
                        : tone === 'done'
                          ? 'bg-primary'
                          : 'bg-border-strong',
                    )}
                  />
                  <span className="mt-2.5 flex min-w-0 items-center gap-2.5 text-sm lg:mt-0">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs tabular-nums',
                        isCurrent
                          ? 'bg-primary text-primary-text'
                          : complete
                            ? 'bg-success-subtle text-success'
                            : 'border border-control text-text-subtle',
                      )}
                    >
                      {complete && !isCurrent ? <Check size={13} weight="bold" /> : i + 1}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 truncate lg:whitespace-normal',
                        // Phone: names stay for screen readers only. The current one is the h1
                        // right below, so nothing is lost on screen.
                        'max-sm:sr-only',
                        isCurrent
                          ? 'font-medium text-text'
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
                </span>
              );
              return (
                <li key={s.slug} className="min-w-0">
                  {reachable && !isCurrent ? (
                    <Link
                      href={`${basePath}/${s.slug}`}
                      className="group block min-h-10 rounded-md pb-1 transition-colors duration-fast ease-out lg:pb-0 lg:hover:bg-surface-sunken"
                    >
                      {body}
                    </Link>
                  ) : (
                    <span
                      className="block min-h-10 pb-1 lg:pb-0"
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

        <div className="min-w-0 lg:col-span-8 lg:col-start-5">
          <header className="mb-10">
            {previous && (
              <Link
                href={`${basePath}/${previous.slug}`}
                className="pressable -ml-2 mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
              >
                <ArrowLeft aria-hidden="true" size={16} />
                Back to {previous.title}
              </Link>
            )}
            <h1 className="text-display-sm">{step?.title}</h1>
            <p className="mt-3 max-w-[56ch] text-lg text-text-muted">{step?.blurb}</p>
          </header>

          <div className="max-w-2xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
