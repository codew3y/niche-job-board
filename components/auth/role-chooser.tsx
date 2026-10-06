'use client';

import { Briefcase, Check, Code } from '@phosphor-icons/react';
import { useActionState, useState } from 'react';

import { FormError } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { selectRole, type ActionResult } from '@/lib/actions/auth';
import { cn } from '@/lib/ui/cn';

const ROLES = [
  {
    value: 'talent',
    icon: Code,
    title: 'I’m looking for work',
    body: 'Build a profile around what you’ve shipped and get matched to briefs that fit it.',
  },
  {
    value: 'client',
    icon: Briefcase,
    title: 'I’m hiring',
    body: 'Post a brief and see ranked candidates with the evidence behind each one.',
  },
] as const;

export function RoleChooser() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(selectRole, null);
  const [selected, setSelected] = useState<string>('talent');

  return (
    <Form state={state} action={formAction} className="space-y-6">
      {/* A radiogroup rather than two buttons: this is one choice with two options, and a
          keyboard user should move between them with arrow keys, not Tab. */}
      <div role="radiogroup" aria-label="How will you use this?" className="grid gap-3">
        {ROLES.map(({ value, icon: Icon, title, body }) => {
          const checked = selected === value;
          return (
            <label
              key={value}
              className={cn(
                'pressable flex cursor-pointer items-start gap-4 rounded-lg border p-5 select-none',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                checked
                  ? 'border-primary bg-primary-subtle'
                  : 'border-control bg-surface-raised hover:border-border-strong hover:bg-surface-sunken',
              )}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={checked}
                onChange={() => setSelected(value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-10 shrink-0 place-items-center rounded-md transition-colors duration-fast',
                  checked ? 'bg-primary text-primary-text' : 'bg-surface-sunken text-text-muted',
                )}
              >
                <Icon size={18} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-text">{title}</span>
                <span className="mt-1 block text-sm text-text-muted">{body}</span>
              </span>
              {/* The radio mark: the selection is shown by shape as well as colour. */}
              <span
                aria-hidden="true"
                className={cn(
                  'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2',
                  checked ? 'border-primary bg-primary text-primary-text' : 'border-control',
                )}
              >
                {checked && <Check size={12} weight="bold" />}
              </span>
            </label>
          );
        })}
      </div>

      {state?.ok === false && <FormError>{state.message}</FormError>}

      <SubmitButton size="lg" className="w-full" pendingLabel="Setting up…">
        Continue
      </SubmitButton>
    </Form>
  );
}
