'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Field } from '@/components/ui/field';
import { SkillPicker, type SkillOption } from './skill-picker';
import { Submit } from './talent-forms';
import { publishFirstJob, saveCompany, saveFirstJob } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { ClientProgress } from '@/lib/onboarding/steps';

type Row = Record<string, unknown> | null;
const str = (r: Row, k: string) => (r?.[k] as string | null) ?? '';

export function CompanyForm({ client }: { client: Row }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCompany, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Company name"
        name="companyName"
        required
        defaultValue={str(client, 'company_name')}
        errors={fields?.companyName}
      />
      <Field
        label="Website"
        name="website"
        type="url"
        placeholder="https://yourcompany.com"
        defaultValue={str(client, 'website')}
        errors={fields?.website}
      />
      <Field
        label="Industry"
        name="industry"
        placeholder="Logistics"
        defaultValue={str(client, 'industry')}
      />
      <div className="space-y-1.5">
        <label htmlFor="about" className="block text-sm font-medium">
          About
        </label>
        <textarea
          id="about"
          name="about"
          rows={4}
          defaultValue={str(client, 'about')}
          placeholder="What the company does, and what you need help with."
          className="w-full rounded-md border border-border-strong bg-surface-raised p-3 placeholder:text-text-subtle"
        />
      </div>
      {state?.ok === false && !state.fields && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
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
  // Location is only required for hybrid/onsite, so the field appears when it becomes
  // relevant rather than sitting there greyed out.
  const [locationType, setLocationType] = useState(str(job, 'location_type') || 'remote');

  return (
    <form action={action} className="space-y-6" noValidate>
      <Field
        label="Title"
        name="title"
        required
        defaultValue={str(job, 'title')}
        placeholder="Stripe and serverless payments integration"
        errors={fields?.title}
      />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          What needs building?
        </label>
        <textarea
          id="description"
          name="description"
          rows={7}
          defaultValue={str(job, 'description')}
          aria-invalid={Boolean(fields?.description)}
          aria-describedby="desc-hint"
          placeholder="The problem, what done looks like, and anything that has already been tried."
          className={`w-full rounded-md border bg-surface-raised p-3 placeholder:text-text-subtle
            ${fields?.description ? 'border-danger' : 'border-border-strong'}`}
        />
        <p
          id="desc-hint"
          className={`text-sm ${fields?.description ? 'text-danger' : 'text-text-muted'}`}
        >
          {fields?.description?.[0] ??
            'At least 120 characters — a short brief gets poorly matched candidates.'}
        </p>
      </div>

      <div>
        <SkillPicker options={options} initial={initial} max={20} />
        {fields?.skills && <p className="mt-1 text-sm text-danger">{fields.skills[0]}</p>}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Engagement</legend>
        <div className="flex flex-wrap gap-2">
          {ENGAGEMENTS.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="engagementType"
                value={value}
                defaultChecked={(str(job, 'engagement_type') || 'fixed') === value}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-border-strong px-4 py-1.5 text-sm transition-colors duration-fast peer-checked:border-accent peer-checked:bg-accent-subtle">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <div className="space-y-1.5">
          <label htmlFor="currency" className="block text-sm font-medium">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={str(job, 'currency') || 'USD'}
            className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3"
          >
            {['USD', 'EUR', 'GBP', 'CHF'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Location</legend>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="locationType"
                value={value}
                checked={locationType === value}
                onChange={() => setLocationType(value)}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-border-strong px-4 py-1.5 text-sm transition-colors duration-fast peer-checked:border-accent peer-checked:bg-accent-subtle">
                {label}
              </span>
            </label>
          ))}
        </div>
        {locationType !== 'remote' && (
          <div className="mt-3">
            <Field
              label="Where?"
              name="location"
              defaultValue={str(job, 'location')}
              placeholder="Zurich"
              errors={fields?.location}
            />
          </div>
        )}
      </fieldset>

      {state?.ok === false && !state.fields && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
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
        <Link href="/onboarding/client/job" className="text-accent underline underline-offset-2">
          write your brief
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <article className="rounded-md border border-border-base bg-surface-raised p-5">
        <h2 className="font-medium">{str(job, 'title')}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-text-muted">
          {str(job, 'description')}
        </p>
      </article>

      <form action={action} className="space-y-4">
        <p className="text-text-muted text-pretty">
          Publishing makes this brief public so developers can find and apply to it. You can close
          it at any time.
        </p>
        {state?.ok === false && (
          <p role="alert" className="text-sm text-danger">
            {state.message}
          </p>
        )}
        <Submit label="Publish this brief" />
      </form>
    </div>
  );
}
