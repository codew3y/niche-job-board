'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { selectRole, type ActionResult } from '@/lib/actions/auth';

const ROLES = [
  {
    value: 'talent',
    title: 'I’m looking for work',
    body: 'Build a profile around what you’ve shipped and get matched to briefs that fit it.',
  },
  {
    value: 'client',
    title: 'I’m hiring',
    body: 'Post a brief and see ranked candidates with the evidence behind each one.',
  },
] as const;

export function RoleChooser() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(selectRole, null);
  const [selected, setSelected] = useState<string>('talent');

  return (
    <form action={formAction} className="space-y-4">
      {/* A radiogroup rather than two buttons: this is one choice with two options, and a
          keyboard user should move between them with arrow keys, not Tab. */}
      <div role="radiogroup" aria-label="How will you use this?" className="space-y-2.5">
        {ROLES.map((role) => {
          const checked = selected === role.value;
          return (
            <label
              key={role.value}
              className={`block cursor-pointer rounded-md border p-4
                transition-[border-color,background-color] duration-fast ease-out
                ${checked ? 'border-accent bg-accent-subtle' : 'border-border-strong hover:bg-surface-sunken'}`}
            >
              <input
                type="radio"
                name="role"
                value={role.value}
                checked={checked}
                onChange={() => setSelected(role.value)}
                className="sr-only"
              />
              <span className="block font-medium">{role.title}</span>
              <span className="mt-1 block text-sm text-text-muted text-pretty">{role.body}</span>
            </label>
          );
        })}
      </div>

      {state?.ok === false && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <Continue />
    </form>
  );
}

function Continue() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? 'Setting up…' : 'Continue'}
    </Button>
  );
}
