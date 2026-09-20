'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { signIn, signUp, type ActionResult } from '@/lib/actions/auth';

export function EmailPasswordForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const action = mode === 'signup' ? signUp : signIn;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}

      {mode === 'signup' && (
        <Field
          label="Your name"
          name="displayName"
          autoComplete="name"
          required
          errors={fields?.displayName}
        />
      )}

      <Field
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        errors={fields?.email}
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
        required
        errors={fields?.password}
        hint={mode === 'signup' ? 'At least 12 characters. Length beats punctuation.' : undefined}
      />

      {state?.ok === false && !state.fields && (
        // aria-live so a screen reader announces the failure rather than leaving the user
        // wondering why nothing happened.
        <p role="alert" aria-live="polite" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <Submit label={mode === 'signup' ? 'Create account' : 'Sign in'} />

      {mode === 'login' && (
        <p className="text-center text-sm">
          <Link href="/reset-password" className="text-text-muted hover:text-text">
            Forgot your password?
          </Link>
        </p>
      )}
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending} aria-busy={pending}>
      {/* The label changes rather than being replaced by a spinner: the user keeps the
          context of what they pressed. */}
      {pending ? 'Working…' : label}
    </Button>
  );
}
