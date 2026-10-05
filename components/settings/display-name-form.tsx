'use client';

import { useActionState } from 'react';

import { Field, FormError, FormStatus } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { updateDisplayName } from '@/lib/actions/display-name';

/** Your name, editable (Settings → Account). */
export function DisplayNameForm({ current }: { current: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateDisplayName, null);
  const fields = state?.ok === false ? state.fields : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field
        label="Your name"
        name="displayName"
        required
        autoComplete="name"
        defaultValue={current}
        errors={fields?.displayName}
        hint="Shown in your profile menu, on messages you send, and in emails and notifications about you."
      />
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save name
        </SubmitButton>
        {state?.ok && <FormStatus>Saved.</FormStatus>}
      </div>
    </form>
  );
}
