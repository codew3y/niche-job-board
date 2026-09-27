'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/actions/auth';
import { sendMessage } from '@/lib/actions/messaging';

/**
 * The reply box.
 *
 * Note what it does NOT do: it never tells the sender their message was refused because they
 * were blocked. A blocked send returns ok and the field clears exactly as it would on success
 * (lib/actions/messaging.ts). Any "delivered" tick or optimistic bubble added here later would
 * be a lie in that case — which is the point, and why there is neither.
 */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="border-t border-border-base pt-4">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="body" className="sr-only">
        Message
      </label>
      <textarea
        id="body"
        name="body"
        rows={3}
        required
        maxLength={5000}
        placeholder="Write a message…"
        className={`w-full rounded-md border bg-surface p-3 placeholder:text-text-subtle ${
          state?.ok === false ? 'border-danger' : 'border-border-strong'
        }`}
      />
      {state?.ok === false && (
        <p role="alert" className="mt-1.5 text-sm text-danger">
          {state.fields?.body?.[0] ?? state.message}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <SendButton />
      </div>
    </form>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Sending…' : 'Send'}
    </Button>
  );
}
