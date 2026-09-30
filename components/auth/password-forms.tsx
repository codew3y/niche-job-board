'use client';

import Link from 'next/link';
import { Check, MailCheck } from 'lucide-react';
import { useActionState } from 'react';

import { buttonStyles } from '@/components/ui/button';
import { Field, FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { requestPasswordReset, updatePassword, type ActionResult } from '@/lib/actions/auth';

export function ResetRequestForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(requestPasswordReset, null);

  if (state?.ok) {
    return (
      <div role="status" className="flex gap-4 rounded-lg bg-success-subtle p-5">
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-raised text-success"
        >
          <MailCheck size={20} />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-text">Check your email.</p>
          {/* Deliberately says "if there's an account": confirming whether an address is
              registered would turn this form into an account-enumeration oracle. */}
          <p className="mt-1 text-sm text-text text-pretty">
            If there&rsquo;s an account for that address, a reset link is on its way. It expires in
            an hour and can only be used once.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      {state?.ok === false && <FormError>{state.message}</FormError>}
      <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">
        Send reset link
      </SubmitButton>
    </form>
  );
}

export function SetPasswordForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(updatePassword, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    return (
      <div role="status" className="space-y-5">
        <p className="flex items-center gap-3 font-semibold">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-md bg-success-subtle text-success"
          >
            <Check size={20} />
          </span>
          Password updated.
        </p>
        <Link href="/login" className={buttonStyles({ size: 'lg', className: 'w-full' })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
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
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <SubmitButton size="lg" className="w-full" pendingLabel="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}
