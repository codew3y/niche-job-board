'use client';

import { Check, CircleDashed } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { useActionState } from 'react';

import { FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { publishTalent } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { TalentProgress } from '@/lib/onboarding/steps';
import { cn } from '@/lib/ui/cn';

type Profile = Record<string, unknown> | null;

export function TalentReview({
  profile,
  progress,
}: {
  profile: Profile;
  progress: TalentProgress;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(publishTalent, null);

  const checks = [
    { done: progress.hasBasics, label: 'Headline and bio', fix: '/onboarding/talent/basics' },
    { done: progress.hasSkills, label: 'Skills and rates', fix: '/onboarding/talent/skills' },
    {
      done: progress.hasEvidence,
      label: 'Portfolio site or two projects',
      fix: '/onboarding/talent/portfolio',
    },
  ];
  const ready = checks.every((c) => c.done);

  return (
    <div className="space-y-8">
      {/* The checklist names exactly what is missing, rather than disabling a button and leaving
          the user to guess (§7, docs/components.md). */}
      <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
        {checks.map((check) => (
          <li
            key={check.label}
            className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-8 shrink-0 place-items-center rounded-md',
                  check.done
                    ? 'bg-success-subtle text-success'
                    : 'border border-control text-text-subtle',
                )}
              >
                {check.done ? <Check size={16} weight="bold" /> : <CircleDashed size={16} />}
              </span>
              <span className={check.done ? 'text-text-muted' : 'font-medium text-text'}>
                {check.label}
              </span>
              {!check.done && <span className="sr-only">(still needed)</span>}
            </span>
            {check.done ? (
              <span className="shrink-0 text-sm text-success">Done</span>
            ) : (
              <Link
                href={check.fix}
                className="inline-flex min-h-10 shrink-0 items-center rounded-md px-2 text-sm font-medium text-link hover:underline"
              >
                Add<span className="sr-only"> {check.label.toLowerCase()}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>

      {ready ? (
        <form action={action} className="space-y-4">
          <p className="max-w-xl text-text-muted text-pretty">
            Publishing makes your profile public and lets clients find you. You can unpublish at any
            time.
          </p>
          {state?.ok === false && <FormError>{state.message}</FormError>}
          <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Publishing…">
            Publish my profile
          </SubmitButton>
        </form>
      ) : (
        <p className="rounded-lg bg-surface-sunken px-4 py-3 text-sm text-text-muted">
          Finish the items above and come back here to publish.
        </p>
      )}

      {!(profile?.website_url as string | null) && progress.hasEvidence && (
        <p className="text-sm text-text-subtle text-pretty">
          Tip: profiles with three or more projects match noticeably better, because there is more
          real work for us to read.
        </p>
      )}
    </div>
  );
}
