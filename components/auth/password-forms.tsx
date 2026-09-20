'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { requestPasswordReset, updatePassword, type ActionResult } from '@/lib/actions/auth';

export function ResetRequestForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div role="status" className="space-y-3">
        <p className="font-medium">Check your email.</p>
        {/* Deliberately says "if there's an account" — confirming whether an address is
            registered would turn this form into an account-enumeration oracle. */}
        <p className="text-sm text-text-muted text-pretty">
          If there&rsquo;s an account for that address, a reset link is on its way. It expires
          in an hour and can only be used once.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" name="email" type="email" inputMode="email" autoComplete="email" required />
      {state?.ok === false && (
        <p role="alert" className="text-sm text-danger">{state.message}</p>
      )}
      <SubmitButton idle="Send reset link" busy="Sending…" />
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(updatePassword, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    return (
      <div role="status" className="space-y-4">
        <p className="font-medium">Password updated.</p>
        <a href="/login" className="inline-block text-accent hover:underline">
          Sign in
        </a>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        errors={fields?.password}
        hint="At least 12 characters."
      />
      <Field
        label="Confirm password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        errors={fields?.confirmPassword}
      />
      {state?.ok === false && !state.fields && (
        <p role="alert" className="text-sm text-danger">{state.message}</p>
      )}
      <SubmitButton idle="Save password" busy="Saving…" />
    </form>
  );
}

function SubmitButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {pending ? busy : idle}
    </Button>
  );
}
