'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/actions/auth';
import { startConversation } from '@/lib/actions/messaging';

/**
 * "Message this developer", from a public profile.
 *
 * Only a client sees this, and only on a published profile that accepts messages — the same
 * three conditions the `conversations_insert_client` policy enforces. Hiding the button for
 * everyone else is courtesy; the policy is the rule.
 */
export function ContactDialog({
  talentId,
  talentHeadline,
  jobs,
}: {
  talentId: string;
  /**
   * The headline, not a name — `talent_profiles` has no name column, and the product presents
   * developers by what they do. Deriving a first name from a headline produces "Message
   * Senior", which is how you can tell nobody read the output.
   */
  talentHeadline: string;
  /** The client's open jobs, so a first message can be anchored to one. */
  jobs: { id: string; title: string }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, action] = useActionState<ActionResult | null, FormData>(startConversation, null);
  const [body, setBody] = useState('');

  return (
    <>
      <Button onClick={() => ref.current?.showModal()}>Message this developer</Button>

      <dialog
        ref={ref}
        aria-labelledby="contact-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-md border border-border-base bg-surface-raised p-0 text-text shadow-md backdrop:bg-black/40"
      >
        <form action={action} className="space-y-4 p-6">
          <input type="hidden" name="talentId" value={talentId} />

          <div>
            <h2 id="contact-title" className="text-lg font-semibold tracking-tight">
              Message
            </h2>
            <p className="mt-0.5 text-sm font-medium text-pretty">{talentHeadline}</p>
            <p className="mt-1 text-sm text-text-muted text-pretty">
              They can reply, block you, or ignore it. Say what the work is and what it pays — those
              are the two things that get an answer.
            </p>
          </div>

          {jobs.length > 0 && (
            <div className="space-y-1.5">
              <label htmlFor="jobId" className="block text-sm font-medium">
                About a job <span className="font-normal text-text-muted">(optional)</span>
              </label>
              <select
                id="jobId"
                name="jobId"
                defaultValue=""
                className="h-11 w-full rounded-md border border-border-strong bg-surface px-3"
              >
                <option value="">General enquiry</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="contact-body" className="block text-sm font-medium">
              Message
            </label>
            <textarea
              id="contact-body"
              name="body"
              rows={6}
              required
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What the project is, roughly what it pays, and why you're asking them specifically."
              className={`w-full rounded-md border bg-surface p-3 placeholder:text-text-subtle ${
                state?.ok === false && state.fields?.body ? 'border-danger' : 'border-border-strong'
              }`}
            />
            {state?.ok === false && state.fields?.body && (
              <p className="text-sm text-danger">{state.fields.body[0]}</p>
            )}
          </div>

          {state?.ok === false && !state.fields && (
            <p role="alert" className="rounded-sm bg-danger-subtle p-3 text-sm text-danger">
              {state.message}
              {state.message.includes('client profile') && (
                <>
                  {' '}
                  <Link href="/onboarding/client/company" className="underline">
                    Add one
                  </Link>
                </>
              )}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => ref.current?.close()}>
              Cancel
            </Button>
            <SubmitContact />
          </div>
        </form>
      </dialog>
    </>
  );
}

function SubmitContact() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Sending…' : 'Send message'}
    </Button>
  );
}
