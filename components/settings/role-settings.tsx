'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { addRole, switchRole, type ActionResult } from '@/lib/actions/auth';

const COPY = {
  talent: {
    title: 'Talent',
    have: 'You can be matched to briefs and apply to jobs.',
    add: 'Build a profile around what you’ve shipped and get matched to briefs.',
  },
  client: {
    title: 'Client',
    have: 'You can post briefs and review ranked candidates.',
    add: 'Post a brief and see ranked candidates with the evidence behind each.',
  },
} as const;

export function RoleSettings({
  activeRole,
  hasTalent,
  hasClient,
}: {
  activeRole: 'talent' | 'client';
  hasTalent: boolean;
  hasClient: boolean;
}) {
  const has = { talent: hasTalent, client: hasClient };

  return (
    <ul className="space-y-3">
      {(['talent', 'client'] as const).map((role) => {
        const owned = has[role];
        const isActive = activeRole === role;
        return (
          <li
            key={role}
            className={`rounded-md border p-5 ${isActive ? 'border-accent' : 'border-border-base'}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium">
                  {COPY[role].title}
                  {isActive && (
                    <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-normal">
                      Currently viewing
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-text-muted text-pretty">
                  {owned ? COPY[role].have : COPY[role].add}
                </p>
              </div>
              <RoleAction role={role} owned={owned} isActive={isActive} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RoleAction({
  role,
  owned,
  isActive,
}: {
  role: 'talent' | 'client';
  owned: boolean;
  isActive: boolean;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(addRole, null);

  if (isActive) return null;

  if (owned) {
    // Already has it — this is just a context switch, so it uses switchRole and creates
    // nothing.
    return (
      <form action={switchRole}>
        <input type="hidden" name="role" value={role} />
        <Button type="submit" variant="secondary" size="sm">
          Switch to {role}
        </Button>
      </form>
    );
  }

  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="role" value={role} />
      <Pending label={`Add ${role} profile`} />
      {state?.ok === false && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Pending({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} aria-busy={pending}>
      {pending ? 'Setting up…' : label}
    </Button>
  );
}
