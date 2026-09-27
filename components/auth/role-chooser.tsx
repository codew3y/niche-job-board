'use client';

import { Briefcase, Code2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import { FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { selectRole, type ActionResult } from '@/lib/actions/auth';
import { cn } from '@/lib/ui/cn';

const ROLES = [
  {
    value: 'talent',
    icon: Code2,
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
    <form action={formAction} className="space-y-6">
      {/* A radiogroup rather than two buttons: this is one choice with two options, and a
          keyboard user should move between them with arrow keys, not Tab. */}
      <div role="radiogroup" aria-label="How will you use this?" className="grid gap-3">
        {ROLES.map(({ value, icon: Icon, title, body }) => {
          const checked = selected === value;
          return (
            <label
              key={value}
              className={cn(
                'pressable flex cursor-pointer gap-4 rounded-lg border p-5 select-none',
                'transition-[border-color,background-color,box-shadow] duration-fast ease-out',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus',
                checked
                  ? 'border-surface-inverse bg-surface-raised shadow-sm'
                  : 'border-border-base hover:border-border-strong',
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
                  'grid size-10 shrink-0 place-items-center rounded-full transition-colors duration-fast',
                  checked
                    ? 'bg-surface-inverse text-text-inverse'
                    : 'bg-surface-sunken text-text-subtle',
                )}
              >
                <Icon size={18} />
              </span>
              <span>
                <span className="block font-medium">{title}</span>
                <span className="mt-1 block text-sm text-text-muted text-pretty">{body}</span>
              </span>
            </label>
          );
        })}
      </div>

      {state?.ok === false && <FormError>{state.message}</FormError>}

      <SubmitButton size="lg" className="w-full" pendingLabel="Setting up…">
        Continue
      </SubmitButton>
    </form>
  );
}
