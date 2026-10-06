'use client';

import { useActionState } from 'react';

import { Field, FormError, FormStatus, TextareaField } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import { updateClientProfile } from '@/lib/actions/client-profile';

type Company = {
  company_name: string;
  website: string | null;
  industry: string | null;
  about: string;
};

/** Every field with an error rendered next to it. Anything else has to go somewhere. */
const INLINE = new Set(['companyName', 'website', 'industry', 'about']);

/**
 * Editing the client profile: the name a client posts under, their own or a business's.
 *
 * That name is the only identity a client has here: it appears on every job card, every public
 * job page and in the other party's inbox.
 */
export function CompanyForm({ company }: { company: Company }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateClientProfile, null);
  const fields = state?.ok === false ? state.fields : undefined;

  // A rejection nobody can see is worse than a crash. The size <select> once failed validation
  // on its own default value, and because that field had no error slot the form rendered a
  // button that did nothing, forever. Any field error without a home on screen is reported at
  // the top rather than swallowed.
  const homeless = Object.entries(fields ?? {}).filter(([key]) => !INLINE.has(key));

  return (
    <Form state={state} action={action} className="space-y-6">
      {state?.ok === false && (
        <FormError>
          {state.message}
          {homeless.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
              {homeless.map(([key, messages]) => (
                <li key={key}>{messages[0]}</li>
              ))}
            </ul>
          )}
        </FormError>
      )}

      <Field
        label="Name on your briefs"
        name="companyName"
        required
        autoComplete="name"
        defaultValue={company.company_name}
        errors={fields?.companyName}
        hint="Shown on every job you post. Your own name, or a business's if you hire for one."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field
          label="Website"
          name="website"
          type="url"
          inputMode="url"
          optional
          defaultValue={company.website ?? ''}
          errors={fields?.website}
          placeholder="https://example.com"
        />
        <Field
          label="Industry"
          name="industry"
          optional
          defaultValue={company.industry ?? ''}
          errors={fields?.industry}
          placeholder="SaaS, agency, e-commerce…"
        />
      </div>

      <TextareaField
        label="What you hire for"
        name="about"
        id="about"
        rows={4}
        optional
        defaultValue={company.about}
        maxLength={2000}
        errors={fields?.about}
        placeholder="A line or two about the work. A developer reads this before deciding whether to apply."
      />

      <div className="flex flex-wrap items-center gap-4 border-t border-border-base pt-5">
        <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        {/* Announced, not just shown — a save that only changes colour is invisible to a screen
            reader. The exact text is what e2e/navigation.spec.ts waits for. */}
        {state?.ok && <FormStatus>Saved.</FormStatus>}
      </div>
    </Form>
  );
}
