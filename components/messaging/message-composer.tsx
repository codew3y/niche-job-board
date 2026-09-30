'use client';

import { SendHorizontal } from 'lucide-react';
import { useActionState, useEffect, useRef } from 'react';

import { controlStyles } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { sendMessage } from '@/lib/actions/messaging';
import { cn } from '@/lib/ui/cn';

/**
 * The reply box, pinned to the bottom of the thread.
 *
 * Note what it does NOT do: it never tells the sender their message was refused because they
 * were blocked. A blocked send returns ok and the field clears exactly as it would on success
 * (lib/actions/messaging.ts). Any "delivered" tick or optimistic bubble added here later would
 * be a lie in that case — which is the point, and why there is neither. For the same reason
 * there is no "sent" toast.
 *
 * On a phone it sits above the tab bar and, with `interactive-widget=resizes-content`, above
 * the keyboard too. ⌘/Ctrl+Enter sends; plain Enter is a newline, because messages here are
 * paragraphs, not chat lines.
 */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="sticky bottom-[env(safe-area-inset-bottom,0px)] -mx-(--gutter) border-t border-border-base bg-surface/95 px-(--gutter) pt-3 pb-3 backdrop-blur-md sm:bottom-0 sm:mx-0 sm:rounded-lg sm:border sm:bg-surface-raised sm:p-3"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="body" className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="body"
          name="body"
          rows={2}
          required
          maxLength={5000}
          enterKeyHint="send"
          placeholder="Write a message…"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          aria-invalid={state?.ok === false}
          aria-describedby={state?.ok === false ? 'composer-error' : undefined}
          className={cn(
            controlStyles,
            'max-h-48 min-h-11 resize-none px-3.5 py-2.5 [field-sizing:content]',
            state?.ok === false ? 'border-danger' : 'border-control/70',
          )}
        />
        <SubmitButton
          aria-label="Send"
          size="icon"
          variant="accent"
          pendingLabel={<SendHorizontal aria-hidden="true" />}
        >
          <SendHorizontal aria-hidden="true" />
        </SubmitButton>
      </div>
      {state?.ok === false && (
        <p id="composer-error" role="alert" className="mt-1.5 text-sm text-danger">
          {state.fields?.body?.[0] ?? state.message}
        </p>
      )}
    </form>
  );
}
