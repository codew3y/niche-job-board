import Link from 'next/link';
import type { ReactNode } from 'react';

type Step = { slug: string; title: string; blurb: string };

/**
 * Wizard chrome: a step rail plus the current step's form.
 *
 * `done` is derived from saved data, not from a counter — see lib/onboarding/steps.ts. A
 * completed step stays clickable so someone can go back and fix a typo; a future step does
 * not, because its form would have nothing to build on.
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

  return (
    <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center gap-2">
          {steps.map((s, i) => {
            const isCurrent = s.slug === current;
            const complete = done(s.slug);
            const reachable = complete || i <= index;
            const dot = (
              <span
                aria-hidden="true"
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-medium
                  ${isCurrent ? 'bg-accent text-accent-text' : complete ? 'bg-success text-white' : 'bg-surface-sunken text-text-subtle'}`}
              >
                {complete && !isCurrent ? '✓' : i + 1}
              </span>
            );
            return (
              <li key={s.slug} className="flex flex-1 items-center gap-2">
                {reachable && !isCurrent ? (
                  <Link href={`${basePath}/${s.slug}`} className="flex items-center gap-2">
                    {dot}
                    <span className="hidden text-sm text-text-muted sm:inline">{s.title}</span>
                  </Link>
                ) : (
                  <span className="flex items-center gap-2">
                    {dot}
                    <span
                      className={`hidden text-sm sm:inline ${isCurrent ? 'font-medium' : 'text-text-subtle'}`}
                      aria-current={isCurrent ? 'step' : undefined}
                    >
                      {s.title}
                    </span>
                  </span>
                )}
                {i < steps.length - 1 && (
                  <span className="h-px flex-1 bg-border-base" aria-hidden="true" />
                )}
              </li>
            );
          })}
        </ol>
        <p className="sr-only">
          Step {index + 1} of {steps.length}: {step?.title}
        </p>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{step?.title}</h1>
        <p className="mt-1 text-text-muted text-pretty">{step?.blurb}</p>
      </header>

      {children}

      {/* Saying this out loud removes the "will I lose this?" hesitation that makes people
          rush a long form. */}
      <p className="mt-6 text-center text-sm text-text-subtle">
        Saved as you go — you can close this and come back.
      </p>
    </main>
  );
}
