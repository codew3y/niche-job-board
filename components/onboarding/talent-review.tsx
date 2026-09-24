'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Submit } from './talent-forms';
import { publishTalent } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { TalentProgress } from '@/lib/onboarding/steps';

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
    <div className="space-y-6">
      {/* The completeness checklist names exactly what is blocking publish, rather than
          disabling a button and leaving the user to guess (§7, docs/components.md). */}
      <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
        {checks.map((check) => (
          <li key={check.label} className="flex items-center justify-between gap-4 p-4">
            <span className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={`grid h-5 w-5 place-items-center rounded-full text-xs
                  ${check.done ? 'bg-success text-white' : 'bg-surface-sunken text-text-subtle'}`}
              >
                {check.done ? '✓' : '!'}
              </span>
              <span className={check.done ? '' : 'font-medium'}>{check.label}</span>
              <span className="sr-only">{check.done ? 'complete' : 'still needed'}</span>
            </span>
            {!check.done && (
              <Link href={check.fix} className="text-sm text-accent underline underline-offset-2">
                Add
              </Link>
            )}
          </li>
        ))}
      </ul>

      {ready ? (
        <form action={action} className="space-y-4">
          <p className="text-text-muted text-pretty">
            Publishing makes your profile public and lets clients find you. You can unpublish at any
            time.
          </p>
          {state?.ok === false && (
            <p role="alert" className="text-sm text-danger">
              {state.message}
            </p>
          )}
          <Submit label="Publish my profile" />
        </form>
      ) : (
        <p className="text-text-muted">Finish the items above and come back here to publish.</p>
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
