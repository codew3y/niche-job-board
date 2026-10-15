'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, type ButtonProps } from './button';

/**
 * A submit button that knows its form is pending.
 *
 * The LABEL changes ("Save" → "Saving…"); the button is not replaced by a spinner. The user keeps
 * the context of what they pressed, and the width barely moves. `aria-busy` tells assistive tech
 * the same thing the label tells everyone else.
 */
export function SubmitButton({
  children,
  pendingLabel,
  ...props
}: Omit<ButtonProps, 'type'> & { children: ReactNode; pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} aria-busy={pending} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
