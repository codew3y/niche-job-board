'use client';

import { Prohibit as Ban, Flag, ShieldCheck } from '@phosphor-icons/react/ssr';
import { useActionState, type ReactElement } from 'react';

import { Button } from '@/components/ui/button';
import { FormError, TextareaField } from '@/components/ui/field';
import { Modal, ModalClose } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { blockUser, reportContent, unblockUser } from '@/lib/actions/messaging';

/**
 * Block and report: the moderation controls for a thread.
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
  if (!counterpartyUserId) return null;

  return (
    <div className="-ml-2 flex items-center gap-1 sm:ml-0">
      <form action={blocked ? unblockUser : blockUser}>
        <input type="hidden" name="userId" value={counterpartyUserId} />
        <SubmitButton
          variant={blocked ? 'secondary' : 'ghost'}
          size="sm"
          className="min-h-10 sm:min-h-0"
          // The title states the RESULT of pressing, not the current state.
          title={
            blocked
              ? `${counterpartyName} can message you again`
              : `Nobody can write in either direction while this stands. ${counterpartyName} is not told.`
          }
        >
          {blocked ? <ShieldCheck aria-hidden="true" /> : <Ban aria-hidden="true" />}
          {blocked ? 'Unblock' : 'Block'}
        </SubmitButton>
      </form>

      <ReportDialog
        trigger={
          <Button variant="ghost" size="sm" className="min-h-10 sm:min-h-0">
            <Flag aria-hidden="true" />
            Report
          </Button>
        }
        subjectType="conversation"
        subjectId={conversationId}
        subjectLabel={`this conversation with ${counterpartyName}`}
      />
    </div>
  );
}

export function ReportDialog({
  trigger,
  subjectType,
  subjectId,
  subjectLabel,
}: {
  trigger: ReactElement;
  subjectType: 'profile' | 'job' | 'message' | 'conversation';
  subjectId: string;
  subjectLabel: string;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(reportContent, null);

  return (
    <Modal
      trigger={trigger}
      size="sm"
      title={state?.ok ? 'Report received' : 'Report'}
      description={state?.ok ? undefined : `Reporting ${subjectLabel}.`}
    >
      {state?.ok ? (
        <div role="status" className="space-y-5">
          {/*
            No queue, no SLA, no automatic action. Saying "we'll look into it" would be a promise
            this product cannot keep, so it says what actually happens instead, and points at
            block, which is the control the reporter holds themselves.
          */}
          <p className="text-sm text-text-muted text-pretty">
            A person reads these; there is no automatic action and no set turnaround.
            {subjectType === 'conversation' || subjectType === 'message'
              ? ' If you want the messages to stop now, block them as well.'
              : ' It stays visible until it has been reviewed.'}
          </p>
          <div className="flex justify-end">
            <ModalClose
              render={
                <Button variant="secondary" size="sm">
                  Close
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-5">
          <input type="hidden" name="subjectType" value={subjectType} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <TextareaField
            label="What is wrong?"
            name="reason"
            rows={4}
            required
            maxLength={1000}
            errors={state?.ok === false ? state.fields?.reason : undefined}
            placeholder="Spam, abuse, a scam, or something else. Include anything we would need to see it."
          />
          {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <ModalClose render={<Button variant="ghost">Cancel</Button>} />
            <SubmitButton variant="danger" pendingLabel="Sending…">
              Send report
            </SubmitButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
