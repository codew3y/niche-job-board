'use client';

import { Warning as TriangleAlert } from '@phosphor-icons/react/ssr';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { deleteAccount } from '@/lib/actions/account';

/**
 * The confirmation step for an irreversible action.
 *
 * Two gates, both deliberate. The form is hidden behind a button, so the input is not sitting on
 * screen waiting to be typed into by accident; and the confirmation is the account's own email
 * address, so getting it right requires knowing which account you are signed in as.
 *
 * No modal. A dialog for this would trap focus over a page the user may want to re-read, and the
 * thing that makes a destructive action safe is the typing, not the overlay. The reveal is an
 * entrance the reader asked for, so it earns a short rise; the delete itself does not animate.
 */
export function DeleteAccount({ email }: { email: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(deleteAccount, null);
  const [armed, setArmed] = useState(false);
  const errors = state?.ok === false ? state.fields?.confirm : undefined;

  if (!armed) {
    return (
      <Button
        variant="danger-ghost"
        className="w-full border border-danger sm:w-auto"
        onClick={() => setArmed(true)}
      >
        Delete my account
      </Button>
    );
  }

  return (
    <form action={action} className="animate-rise space-y-5 border-t border-border-base pt-5">
      <p className="flex gap-3 rounded-md bg-danger-subtle px-3.5 py-3 text-sm font-medium text-danger">
        <TriangleAlert aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
        This cannot be undone. Type the email address you sign in with to confirm.
      </p>

      {state?.ok === false && !errors && <FormError>{state.message}</FormError>}

      <Field
        label="Type your email address to confirm"
        name="confirm"
        type="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        errors={errors}
        placeholder={email}
        // The field only exists because the reader just asked for it, so focus goes to it.
        autoFocus
      />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={() => setArmed(false)}>
          Cancel
        </Button>
        <SubmitButton variant="danger" pendingLabel="Deleting…">
          Delete my account permanently
        </SubmitButton>
      </div>
    </form>
  );
}
