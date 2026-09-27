'use client';

import { Check, CircleDashed } from 'lucide-react';
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
          <li key={check.label} className="flex items-center justify-between gap-4 px-5 py-4">
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-7 place-items-center rounded-full',
                  check.done
                    ? 'bg-success-subtle text-success'
                    : 'bg-surface-sunken text-text-subtle',
                )}
              >
                {check.done ? <Check size={15} /> : <CircleDashed size={15} />}
              </span>
              <span className={check.done ? 'text-text-muted' : 'font-medium'}>{check.label}</span>
              <span className="sr-only">{check.done ? 'complete' : 'still needed'}</span>
            </span>
            {!check.done && (
              <Link href={check.fix} className="prose-link text-sm font-medium">
                Add
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
          <SubmitButton variant="accent" size="lg" pendingLabel="Publishing…">
            Publish my profile
          </SubmitButton>
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
