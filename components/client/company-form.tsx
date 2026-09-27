'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import type { ActionResult } from '@/lib/actions/auth';
import { updateClientProfile } from '@/lib/actions/client-profile';
import { companySizes } from '@/lib/schemas/client';

type Company = {
  company_name: string;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  about: string;
};

/** Every field with an error rendered next to it. Anything else has to go somewhere. */
const INLINE = new Set(['companyName', 'website', 'industry', 'companySize', 'about']);

/**
 * Editing the company a client posts under.
 *
 * The company name is the only identity a client has here — it appears on every job card,
 * every public job page and in the other party's inbox. Until now it could be set once during
 * onboarding and never changed.
 */
export function CompanyForm({ company }: { company: Company }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateClientProfile, null);
  const fields = state?.ok === false ? state.fields : undefined;

  // A rejection nobody can see is worse than a crash. The size <select> used to fail
  // validation on its own default value, and because that field had no error slot the form
  // rendered a button that did nothing, forever. This catches the general case: any field
  // error without a home on screen is reported at the top rather than swallowed.
  const homeless = Object.entries(fields ?? {}).filter(([key]) => !INLINE.has(key));

  return (
    <form action={action} className="space-y-4">
      {state?.ok === false && (
        <div role="alert" className="rounded-sm bg-danger-subtle p-3 text-sm text-danger">
          <p>{state.message}</p>
          {homeless.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {homeless.map(([key, messages]) => (
                <li key={key}>{messages[0]}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Field
        label="Company name"
        name="companyName"
        required
        defaultValue={company.company_name}
        errors={fields?.companyName}
        hint="Shown on every job you post."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Website"
          name="website"
          type="url"
          defaultValue={company.website ?? ''}
          errors={fields?.website}
          placeholder="https://example.com"
        />
        <Field
          label="Industry"
          name="industry"
          defaultValue={company.industry ?? ''}
          errors={fields?.industry}
          placeholder="SaaS, agency, e-commerce…"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="companySize" className="block text-sm font-medium">
          Company size
        </label>
        <select
          id="companySize"
          name="companySize"
          defaultValue={company.company_size ?? ''}
          aria-invalid={fields?.companySize ? true : undefined}
          className={`h-11 w-full rounded-md border bg-surface-raised px-3 ${
            fields?.companySize ? 'border-danger' : 'border-border-strong'
          }`}
        >
          <option value="">Prefer not to say</option>
          {companySizes.map((s) => (
            <option key={s} value={s}>
              {s} people
            </option>
          ))}
        </select>
        {fields?.companySize && <p className="text-sm text-danger">{fields.companySize[0]}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="about" className="block text-sm font-medium">
          About
        </label>
        <textarea
          id="about"
          name="about"
          rows={4}
          defaultValue={company.about}
          maxLength={2000}
          aria-invalid={fields?.about ? true : undefined}
          placeholder="What you build and who for. A developer reads this before deciding whether to apply."
          className={`w-full rounded-md border bg-surface-raised p-3 placeholder:text-text-subtle ${
            fields?.about ? 'border-danger' : 'border-border-strong'
          }`}
        />
        {fields?.about && <p className="text-sm text-danger">{fields.about[0]}</p>}
      </div>

      <div className="flex items-center gap-3">
        <Save />
        {/* Announced, not just shown — a save that only changes colour is invisible to a
            screen reader. */}
        <p aria-live="polite" className="text-sm text-text-muted">
          {state?.ok ? 'Saved.' : ''}
        </p>
      </div>
    </form>
  );
}

function Save() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : 'Save changes'}
    </Button>
  );
}
