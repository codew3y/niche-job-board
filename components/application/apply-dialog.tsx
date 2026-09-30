'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormError, TextareaField } from '@/components/ui/field';
import { Modal, ModalClose } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';
import { applyToJob } from '@/lib/actions/applications';
import type { ActionResult } from '@/lib/actions/auth';

/**
 * Apply to a job, in the shared Modal: a bottom sheet on phones, a centred panel on desktop.
 *
 * THIS COMPONENT DOES NOT RENDER THE CONFIRMATION, and must not try. `ApplySection` is a Server
 * Component: once the application row exists, the re-render takes the `already-applied` branch
 * and this component unmounts with the modal. An earlier version had an unreachable "sent"
 * screen here for exactly that reason, found only by an end-to-end test that actually applied.
 * The confirmation lives in ApplySection's `already-applied` branch, which also survives a
 * refresh.
 */
export function ApplyDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(applyToJob, null);
  const [note, setNote] = useState('');
  const length = note.trim().length;

  return (
    <Modal
      trigger={
        <Button size="lg" className="w-full">
          Apply for this job
        </Button>
      }
      title="Apply"
      description={jobTitle}
    >
      <form action={action} className="space-y-5">
        <input type="hidden" name="jobId" value={jobId} />

        <TextareaField
          label="Why you fit"
          name="coverNote"
          rows={6}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          errors={state?.ok === false ? state.fields?.coverNote : undefined}
          placeholder="Which part of this have you done before? Point at the project on your profile that proves it."
          hint={
            <span className="tabular-nums">
              {length} of 40 characters minimum. A short note reads as a bulk send.
            </span>
          }
        />

        {state?.ok === false && !state.fields && (
          <FormError>
            {state.message}
            {state.message.includes('Publish your profile') && (
              <>
                {' '}
                <Link href="/onboarding/talent/review" className="underline">
                  Publish now
                </Link>
              </>
            )}
            {state.message.includes('need a talent profile') && (
              <>
                {' '}
                <Link href="/onboarding/talent/basics" className="underline">
                  Create one
                </Link>
              </>
            )}
          </FormError>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalClose render={<Button variant="ghost">Cancel</Button>} />
          <SubmitButton pendingLabel="Sending…">Send application</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
