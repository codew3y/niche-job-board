'use client';

import { Briefcase, Code2 } from 'lucide-react';
import { useActionState } from 'react';

import { ActionForm } from '@/components/ui/action-form';
import { Badge } from '@/components/ui/badge';
import { FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { addRole, switchRole, type ActionResult } from '@/lib/actions/auth';
import { cn } from '@/lib/ui/cn';

const COPY = {
  talent: {
    title: 'Developer',
    icon: Code2,
    have: 'You can be matched to briefs and apply to jobs.',
    add: 'Build a profile around what you’ve shipped and get matched to briefs.',
  },
  client: {
    title: 'Client',
    icon: Briefcase,
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
    <ul className="grid gap-3 sm:grid-cols-2">
      {(['talent', 'client'] as const).map((role) => {
        const owned = has[role];
        const isActive = activeRole === role;
        const { title, icon: Icon, have, add } = COPY[role];
        return (
          <li
            key={role}
            className={cn(
              'flex flex-col rounded-lg border bg-surface-raised p-5',
              isActive ? 'border-surface-inverse' : 'border-border-base',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-10 place-items-center rounded-md',
                  isActive
                    ? 'bg-surface-inverse text-text-inverse'
                    : 'bg-surface-sunken text-text-subtle',
                )}
              >
                <Icon size={18} />
              </span>
              {isActive ? (
                <Badge tone="ink">Viewing now</Badge>
              ) : owned ? (
                <Badge tone="success">Set up</Badge>
              ) : (
                <Badge tone="outline">Not added</Badge>
              )}
            </div>
            <p className="mt-4 font-semibold tracking-tight">{title}</p>
            <p className="mt-1 flex-1 text-sm text-text-muted text-pretty">{owned ? have : add}</p>
            <div className="mt-5">
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
    // Already has it — a context switch, so it uses switchRole and creates nothing.
    return (
      <ActionForm action={switchRole}>
        <input type="hidden" name="role" value={role} />
        <SubmitButton variant="secondary" size="sm" pendingLabel="Switching…">
          Switch to {role}
        </SubmitButton>
      </ActionForm>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="role" value={role} />
      <SubmitButton size="sm" pendingLabel="Setting up…">
        Add {role} profile
      </SubmitButton>
      {state?.ok === false && <FormError>{state.message}</FormError>}
    </form>
  );
}
