'use client';

import { MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormError, SelectField, TextareaField } from '@/components/ui/field';
import { Modal, ModalClose } from '@/components/ui/modal';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { startConversation } from '@/lib/actions/messaging';

/**
 * "Message this developer", from a public profile.
 *
 * Only a client sees this, and only on a published profile that accepts messages: the same
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
  const [state, action] = useActionState<ActionResult | null, FormData>(startConversation, null);

  return (
    <Modal
      trigger={
        <Button size="lg">
          <MessageSquare aria-hidden="true" />
          Message this developer
        </Button>
      }
      title="Message"
      description={talentHeadline}
    >
      <form action={action} className="space-y-5">
        <input type="hidden" name="talentId" value={talentId} />
        <p className="text-sm text-text-muted text-pretty">
          They can reply, block you, or ignore it. Say what the work is and what it pays: those two
          things are what get an answer.
        </p>

        {jobs.length > 0 && (
          <SelectField label="About a job" name="jobId" id="jobId" optional defaultValue="">
            <option value="">General enquiry</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </SelectField>
        )}

        <TextareaField
          label="Message"
          name="body"
          id="contact-body"
          rows={6}
          required
          maxLength={5000}
          errors={state?.ok === false ? state.fields?.body : undefined}
          placeholder="What the project is, roughly what it pays, and why you're asking them specifically."
        />

        {state?.ok === false && !state.fields && (
          <FormError>
            {state.message}
            {state.message.includes('client profile') && (
              <>
                {' '}
                <Link href="/onboarding/client/company" className="underline">
                  Add one
                </Link>
              </>
            )}
          </FormError>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalClose render={<Button variant="ghost">Cancel</Button>} />
          <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
        </div>
      </form>
    </Modal>
  );
}
