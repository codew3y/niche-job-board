'use client';

import { useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/actions/auth';
import { blockUser, reportContent, unblockUser } from '@/lib/actions/messaging';

/**
 * Block and report — the moderation controls for a thread.
 *
 * v1 has no review queue (docs/constraints.md §6), so these two are not a supplement to
 * moderation, they are the moderation. Both sit in the open at the top of the thread rather
 * than behind an overflow menu: a control you need while being harassed is not one to make
 * people hunt for.
 */
export function ThreadActions({
  conversationId,
  counterpartyUserId,
  counterpartyName,
  blocked,
}: {
  conversationId: string;
  /** Null when that side deleted their account — nobody left to block. */
  counterpartyUserId: string | null;
  counterpartyName: string;
  blocked: boolean;
}) {
  const reportRef = useRef<HTMLDialogElement>(null);

  if (!counterpartyUserId) return null;

  return (
    <div className="flex items-center gap-2">
      <form action={blocked ? unblockUser : blockUser}>
        <input type="hidden" name="userId" value={counterpartyUserId} />
        <BlockButton blocked={blocked} name={counterpartyName} />
      </form>

      <Button variant="ghost" size="sm" onClick={() => reportRef.current?.showModal()}>
        Report
      </Button>

      <ReportDialog
        dialogRef={reportRef}
        subjectType="conversation"
        subjectId={conversationId}
        subjectLabel={`this conversation with ${counterpartyName}`}
      />
    </div>
  );
}

function BlockButton({ blocked, name }: { blocked: boolean; name: string }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={blocked ? 'secondary' : 'ghost'}
      size="sm"
      disabled={pending}
      // The label states the resulting state, not the current one.
      title={
        blocked
          ? `${name} can message you again`
          : `Nobody can write in either direction while this stands. ${name} is not told.`
      }
    >
      {blocked ? 'Unblock' : 'Block'}
    </Button>
  );
}

export function ReportDialog({
  dialogRef,
  subjectType,
  subjectId,
  subjectLabel,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  subjectType: 'profile' | 'job' | 'message' | 'conversation';
  subjectId: string;
  subjectLabel: string;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(reportContent, null);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="report-title"
      className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-md border border-border-base bg-surface-raised p-0 text-text shadow-md backdrop:bg-black/40"
    >
      <div className="p-6">
        {state?.ok ? (
          <div role="status">
            <h2 id="report-title" className="text-lg font-semibold tracking-tight">
              Report received
            </h2>
            {/*
              No queue, no SLA, no automatic action. Saying "we'll look into it" would be a
              promise this product cannot keep, so it says what actually happens instead —
              and points at block, which is the control the reporter holds themselves.
            */}
            <p className="mt-2 text-sm text-text-muted text-pretty">
              A person reads these; there is no automatic action and no set turnaround. If you want
              the messages to stop now, block them as well.
            </p>
            <div className="mt-5 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => dialogRef.current?.close()}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <input type="hidden" name="subjectType" value={subjectType} />
            <input type="hidden" name="subjectId" value={subjectId} />

            <div>
              <h2 id="report-title" className="text-lg font-semibold tracking-tight">
                Report
              </h2>
              <p className="mt-1 text-sm text-text-muted text-pretty">Reporting {subjectLabel}.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reason" className="block text-sm font-medium">
                What is wrong?
              </label>
              <textarea
                id="reason"
                name="reason"
                rows={4}
                required
                maxLength={1000}
                placeholder="Spam, abuse, a scam, something else — and anything we would need to see it."
                className={`w-full rounded-md border bg-surface p-3 placeholder:text-text-subtle ${
                  state?.ok === false && state.fields?.reason
                    ? 'border-danger'
                    : 'border-border-strong'
                }`}
              />
              {state?.ok === false && (
                <p role="alert" className="text-sm text-danger">
                  {state.fields?.reason?.[0] ?? state.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()}>
                Cancel
              </Button>
              <SubmitReport />
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

function SubmitReport() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? 'Sending…' : 'Send report'}
    </Button>
  );
}
