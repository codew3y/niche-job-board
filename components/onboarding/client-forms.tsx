'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { ChoiceChips, Field, FormError, SelectField, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { SkillPicker, type SkillOption } from './skill-picker';
import { CURRENCIES, StepCard, Submit } from './talent-forms';
import { publishFirstJob, saveCompany, saveFirstJob } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { ClientProgress } from '@/lib/onboarding/steps';

type Row = Record<string, unknown> | null;
const str = (r: Row, k: string) => (r?.[k] as string | null) ?? '';

export function CompanyForm({ client }: { client: Row }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCompany, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      <StepCard>
        <Field
          label="Company name"
          name="companyName"
          required
          autoComplete="organization"
          defaultValue={str(client, 'company_name')}
          errors={fields?.companyName}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Website"
            name="website"
            type="url"
            inputMode="url"
            optional
            placeholder="https://yourcompany.com"
            defaultValue={str(client, 'website')}
            errors={fields?.website}
          />
          <Field
            label="Industry"
            name="industry"
            optional
            placeholder="Logistics"
            defaultValue={str(client, 'industry')}
          />
        </div>
        <TextareaField
          label="About"
          name="about"
          rows={4}
          optional
          defaultValue={str(client, 'about')}
          placeholder="What the company does, and what you need help with."
        />
      </StepCard>
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </form>
  );
}

const ENGAGEMENTS = [
  ['fixed', 'Fixed price'],
  ['hourly', 'Hourly'],
  ['retainer', 'Retainer'],
] as const;
const LOCATIONS = [
  ['remote', 'Remote'],
  ['hybrid', 'Hybrid'],
  ['onsite', 'Onsite'],
] as const;

export function FirstJobForm({
  job,
  options,
  initial,
}: {
  job: Row;
  options: SkillOption[];
  initial: string[];
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveFirstJob, null);
  const fields = state?.ok === false ? state.fields : undefined;
  // Location is only required for hybrid/onsite, so the field appears when it becomes relevant
  // rather than sitting there greyed out.
  const [locationType, setLocationType] = useState(str(job, 'location_type') || 'remote');

  return (
    <form action={action} className="space-y-6" noValidate>
      <StepCard>
        <Field
          label="Title"
          name="title"
          required
          defaultValue={str(job, 'title')}
          placeholder="Stripe and serverless payments integration"
          errors={fields?.title}
        />
        <TextareaField
          label="What needs building?"
          name="description"
          rows={7}
          defaultValue={str(job, 'description')}
          errors={fields?.description}
          placeholder="The problem, what done looks like, and anything that has already been tried."
          hint="At least 120 characters — a short brief gets poorly matched candidates."
        />
        <div>
          <SkillPicker options={options} initial={initial} max={20} />
          {fields?.skills && <p className="mt-1.5 text-sm text-danger">{fields.skills[0]}</p>}
        </div>
      </StepCard>

      <StepCard>
        <ChoiceChips
          legend="Engagement"
          name="engagementType"
          options={ENGAGEMENTS}
          defaultValue={str(job, 'engagement_type') || 'fixed'}
        />
        <div className="grid gap-5 sm:grid-cols-3">
          <Field
            label="Budget from"
            name="budgetMin"
            inputMode="decimal"
            defaultValue={str(job, 'budget_min')}
            placeholder="2000"
          />
          <Field
            label="Budget to"
            name="budgetMax"
            inputMode="decimal"
            defaultValue={str(job, 'budget_max')}
            placeholder="4000"
            errors={fields?.budgetMax}
          />
          <SelectField
            label="Currency"
            name="currency"
            defaultValue={str(job, 'currency') || 'USD'}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-4">
          <ChoiceChips
            legend="Location"
            name="locationType"
            options={LOCATIONS}
            value={locationType}
            onChange={setLocationType}
          />
          {locationType !== 'remote' && (
            <Field
              label="Where?"
              name="location"
              defaultValue={str(job, 'location')}
              placeholder="Zurich"
              errors={fields?.location}
            />
          )}
        </div>
      </StepCard>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </form>
  );
}

export function ClientReview({ job, progress }: { job: Row; progress: ClientProgress }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(publishFirstJob, null);

  if (!progress.hasJobDraft) {
    return (
      <p className="text-text-muted">
        No draft yet —{' '}
        <Link href="/onboarding/client/job" className="prose-link font-semibold">
          write your brief
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <article className="rounded-lg border border-border-base bg-surface-raised p-5 sm:p-7">
        <p className="text-xs font-semibold tracking-eyebrow text-text-subtle uppercase">Preview</p>
        <h2 className="mt-2 font-semibold text-2xl">{str(job, 'title')}</h2>
        <p className="mt-3 text-sm whitespace-pre-line text-text-muted">
          {str(job, 'description')}
        </p>
      </article>

      <form action={action} className="space-y-4">
        <p className="max-w-xl text-text-muted text-pretty">
          Publishing makes this brief public so developers can find and apply to it. You can close
          it at any time.
        </p>
        {state?.ok === false && <FormError>{state.message}</FormError>}
        <SubmitButton variant="accent" size="lg" pendingLabel="Publishing…">
          Publish this brief
        </SubmitButton>
      </form>
    </div>
  );
}
