'use client';

import Link from 'next/link';
import { useActionState } from 'react';

import { Field, FormError } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { signIn, signUp, type ActionResult } from '@/lib/actions/auth';

export function EmailPasswordForm({
  mode,
  next,
  intent,
}: {
  mode: 'login' | 'signup';
  next?: string;
  /**
   * Which role the visitor said they were on the landing page.
   *
   * A HINT carried through signup so the flow can skip /select-role, not a claim about
   * anything. The role itself is created by onboarding under RLS; this only decides which
   * screen comes next, so a forged value costs an unwanted onboarding step and nothing more.
   */
  intent?: 'talent' | 'client' | null;
}) {
  const action = mode === 'signup' ? signUp : signIn;
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <Form state={state} action={formAction} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {intent && <input type="hidden" name="intent" value={intent} />}

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
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        errors={fields?.email}
      />

      <div>
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          errors={fields?.password}
          hint={mode === 'signup' ? 'At least 12 characters. Length beats punctuation.' : undefined}
        />
        {mode === 'login' && (
          <p className="mt-1 flex justify-end text-sm">
            {/* min-h-10: a 40px tap target, without making the line look like a button. */}
            <Link
              href="/reset-password"
              className="inline-flex min-h-10 items-center rounded-md font-medium text-link hover:underline"
            >
              Forgot your password?
            </Link>
          </p>
        )}
      </div>

      {/* aria-live via role=alert, so a failed sign-in is announced rather than silent. */}
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}

      {/* The label changes rather than being replaced by a spinner: the user keeps the context of
          what they pressed. */}
      <SubmitButton
        size="lg"
        className="w-full"
        pendingLabel={mode === 'signup' ? 'Creating account…' : 'Signing in…'}
      >
        {mode === 'signup' ? 'Create account' : 'Sign in'}
      </SubmitButton>
    </Form>
  );
}
