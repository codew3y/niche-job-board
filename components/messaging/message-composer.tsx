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
 * be a lie in that case, which is the point, and why there is neither. For the same reason
 * there is no "sent" toast.
 *
 * KEYBOARD — `sticky bottom-0` inside the scrolling page, and app/layout.tsx sets
 * `interactive-widget=resizes-content`, so when a phone keyboard opens the layout viewport
 * shrinks and the composer rides on top of the keyboard instead of under it. The bottom padding
 * adds the home-indicator inset, so on a notched phone the send button is never under the bar.
 * Cmd/Ctrl+Enter sends; plain Enter is a newline, because messages here are paragraphs, not chat
 * lines. The hint says so from sm up, where there is a physical keyboard to hint at.
 */
export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(sendMessage, null);
  const formRef = useRef<HTMLFormElement>(null);
  const failed = state?.ok === false;

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className={cn(
        'sticky bottom-0 z-sticky',
        // Phone: a full-bleed bar on the page surface, padded for the home indicator.
        '-mx-4 border-t border-border-base bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
        // From sm: a raised panel that floats a little above the bottom edge.
        'sm:bottom-4 sm:mx-0 sm:rounded-lg sm:border sm:bg-surface-raised sm:p-3 sm:shadow-md',
      )}
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
          aria-invalid={failed}
          aria-describedby={failed ? 'composer-error' : 'composer-hint'}
          className={cn(
            controlStyles,
            'max-h-48 min-h-11 resize-none px-3.5 py-2.5 [field-sizing:content]',
            failed ? 'border-danger' : 'border-control',
          )}
        />
        <SubmitButton
          aria-label="Send"
          size="icon"
          pendingLabel={<SendHorizontal aria-hidden="true" />}
        >
          <SendHorizontal aria-hidden="true" />
        </SubmitButton>
      </div>
      {failed ? (
        <p id="composer-error" role="alert" className="mt-1.5 text-sm text-danger">
          {state.fields?.body?.[0] ?? state.message}
        </p>
      ) : (
        <p id="composer-hint" className="mt-1.5 hidden text-xs text-text-subtle sm:block">
          Enter adds a new line. Press Ctrl or Cmd and Enter to send.
        </p>
      )}
    </form>
  );
}
