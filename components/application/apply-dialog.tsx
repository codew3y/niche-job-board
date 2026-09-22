'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { applyToJob } from '@/lib/actions/applications';
import type { ActionResult } from '@/lib/actions/auth';

/**
 * Apply to a job.
 *
 * A native <dialog> rather than a hand-rolled modal: focus trapping, Escape to close, inert
 * background and the top layer all come for free and all are things a custom modal gets
 * subtly wrong. Per the animation-frequency rule, a modal is "occasional", so it earns a
 * standard entrance — modals scale from centre, not from a trigger.
 */
export function ApplyDialog({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<ActionResult | null, FormData>(applyToJob, null);
  const [note, setNote] = useState('');

  // Closing on success would hide the confirmation, so the dialog stays open and swaps
  // content instead.
  const sent = state?.ok === true;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setNote((n) => n); // keep the draft if they reopen
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>Apply for this job</Button>

      <dialog
        ref={ref}
        aria-labelledby="apply-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-[--radius] border border-border-base bg-surface-raised p-0 text-text shadow-md backdrop:bg-black/40"
      >
        <div className="p-6">
          {sent ? (
            <div role="status">
              <h2 id="apply-title" className="text-lg font-semibold tracking-tight">
                Application sent
              </h2>
              <p className="mt-2 text-text-muted text-pretty">
                {jobTitle} — you&rsquo;ll see status changes as they happen.
              </p>
              <div className="mt-5 flex gap-3">
                <Link
                  href="/dashboard/talent/applications"
                  className="inline-flex h-10 items-center rounded-[--radius] bg-accent px-4 text-sm font-medium text-accent-text"
                >
                  Track it
                </Link>
                <Button variant="ghost" size="sm" onClick={() => ref.current?.close()}>
                  Keep browsing
                </Button>
              </div>
            </div>
          ) : (
            <form action={action} className="space-y-4">
              <input type="hidden" name="jobId" value={jobId} />

              <div>
                <h2 id="apply-title" className="text-lg font-semibold tracking-tight">
                  Apply
                </h2>
                <p className="mt-1 text-sm text-text-muted text-pretty">{jobTitle}</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="coverNote" className="block text-sm font-medium">
                  Why you fit
                </label>
                <textarea
                  id="coverNote"
                  name="coverNote"
                  rows={6}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-describedby="coverNote-hint"
                  placeholder="Which part of this have you done before? Point at the project on your profile that proves it."
                  className={`w-full rounded-[--radius] border bg-surface p-3 placeholder:text-text-subtle
                    ${state?.ok === false && state.fields?.coverNote ? 'border-danger' : 'border-border-strong'}`}
                />
                <p
                  id="coverNote-hint"
                  className={`text-sm ${state?.ok === false && state.fields?.coverNote ? 'text-danger' : 'text-text-muted'}`}
                >
                  {state?.ok === false && state.fields?.coverNote
                    ? state.fields.coverNote[0]
                    : `${note.trim().length}/40 characters minimum — a blank application reads as a bulk send.`}
                </p>
              </div>

              {state?.ok === false && !state.fields && (
                <p
                  role="alert"
                  className="rounded-[--radius-sm] bg-danger-subtle p-3 text-sm text-danger"
                >
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
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
                  Cancel
                </Button>
                <SubmitApply />
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

function SubmitApply() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Sending…' : 'Send application'}
    </Button>
  );
}
