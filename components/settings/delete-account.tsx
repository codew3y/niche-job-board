'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Field } from '@/components/ui/field';
import type { ActionResult } from '@/lib/actions/auth';
import { deleteAccount } from '@/lib/actions/account';

/**
 * The confirmation step for an irreversible action.
 *
 * Two gates, both deliberate. The form is hidden behind a button, so the input is not sitting
 * on screen waiting to be typed into by accident; and the confirmation is the account's own
 * email address, so getting it right requires knowing which account you are signed in as.
 *
 * No modal. A dialog for this would trap focus over a page the user may want to re-read, and
 * the thing that makes a destructive action safe is the typing, not the overlay.
 */
export function DeleteAccount({ email }: { email: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(deleteAccount, null);
  const [armed, setArmed] = useState(false);
  const errors = state?.ok === false ? state.fields?.confirm : undefined;

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="rounded-md border border-danger px-4 py-2 text-sm font-medium text-danger transition-colors duration-fast hover:bg-danger-subtle"
      >
        Delete my account
      </button>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state?.ok === false && !errors && (
        <p role="alert" className="rounded-sm bg-danger-subtle p-3 text-sm text-danger">
          {state.message}
        </p>
      )}

      <Field
        label="Type your email address to confirm"
        name="confirm"
        type="email"
        autoComplete="off"
        spellCheck={false}
        required
        errors={errors}
        placeholder={email}
        hint="This cannot be undone."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Confirm />
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="rounded-md px-4 py-2 text-sm text-text-muted hover:bg-surface-sunken hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-danger px-4 py-2 text-sm font-medium text-white transition-colors duration-fast hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete my account permanently'}
    </button>
  );
}
