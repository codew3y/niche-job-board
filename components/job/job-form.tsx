'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
import { saveJob } from '@/lib/actions/jobs';
import type { ActionResult } from '@/lib/actions/auth';

type Job = Record<string, unknown> | null;
const str = (j: Job, k: string) => (j?.[k] as string | null) ?? '';

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
const LEVELS = [
  ['', 'Any'],
  ['junior', 'Junior'],
  ['mid', 'Mid'],
  ['senior', 'Senior'],
  ['lead', 'Lead'],
] as const;

/**
 * One form for creating and editing.
 *
 * Two submit buttons rather than a status dropdown: "save draft" and "publish" are different
 * intents, and making the user set a state field to express one is a worse way to ask.
 * The intent travels as a hidden value on the button itself.
 */
export function JobForm({
  job,
  options,
  initialSkills,
  isPublished,
}: {
  job: Job;
  options: SkillOption[];
  initialSkills: string[];
  isPublished: boolean;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveJob, null);
  const fields = state?.ok === false ? state.fields : undefined;
  const [locationType, setLocationType] = useState(str(job, 'location_type') || 'remote');

  return (
    <form action={action} className="space-y-6" noValidate>
      {job?.id ? <input type="hidden" name="jobId" value={String(job.id)} /> : null}

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
          rows={8}
          defaultValue={str(job, 'description')}
          aria-invalid={Boolean(fields?.description)}
          aria-describedby="desc-hint"
          placeholder="The problem, what done looks like, and anything already tried."
          className={`w-full rounded-[--radius] border bg-surface-raised p-3 placeholder:text-text-subtle
            ${fields?.description ? 'border-danger' : 'border-border-strong'}`}
        />
        <p
          id="desc-hint"
          className={`text-sm ${fields?.description ? 'text-danger' : 'text-text-muted'}`}
        >
          {fields?.description?.[0] ??
            'At least 120 characters — this is what matching reads, and what candidates judge.'}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="requirements" className="block text-sm font-medium">
          Requirements <span className="font-normal text-text-subtle">(optional)</span>
        </label>
        <textarea
          id="requirements"
          name="requirements"
          rows={3}
          defaultValue={str(job, 'requirements')}
          className="w-full rounded-[--radius] border border-border-strong bg-surface-raised p-3"
        />
      </div>

      <div>
        <SkillPicker options={options} initial={initialSkills} max={20} />
        {fields?.skills && <p className="mt-1 text-sm text-danger">{fields.skills[0]}</p>}
        <p className="mt-1 text-sm text-text-subtle">The first three count as required.</p>
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
              <span className="inline-block rounded-full border border-border-strong px-4 py-1.5 text-sm transition-colors duration-[--duration-fast] peer-checked:border-accent peer-checked:bg-accent-subtle">
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
            className="h-11 w-full rounded-[--radius] border border-border-strong bg-surface-raised px-3"
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
              <span className="inline-block rounded-full border border-border-strong px-4 py-1.5 text-sm transition-colors duration-[--duration-fast] peer-checked:border-accent peer-checked:bg-accent-subtle">
                {label}
              </span>
            </label>
          ))}
        </div>
        {/* Only rendered when it is actually required, rather than sitting there disabled. */}
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="experienceLevel" className="block text-sm font-medium">
            Experience
          </label>
          <select
            id="experienceLevel"
            name="experienceLevel"
            defaultValue={str(job, 'experience_level')}
            className="h-11 w-full rounded-[--radius] border border-border-strong bg-surface-raised px-3"
          >
            {LEVELS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Deadline"
          name="deadline"
          type="date"
          defaultValue={str(job, 'deadline').slice(0, 10)}
          errors={fields?.deadline}
          hint="Optional. Shown to candidates and used in search listings."
        />
      </div>

      {state?.ok === false && !state.fields && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border-base pt-5">
        {!isPublished && <Submit intent="draft" label="Save draft" variant="secondary" />}
        <Submit
          intent="publish"
          label={isPublished ? 'Save changes' : 'Publish'}
          variant="primary"
        />
      </div>
    </form>
  );
}

function Submit({
  intent,
  label,
  variant,
}: {
  intent: string;
  label: string;
  variant: 'primary' | 'secondary';
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      name="intent"
      value={intent}
      variant={variant}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Saving…' : label}
    </Button>
  );
}
