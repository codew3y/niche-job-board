'use client';

import { useActionState, useState, type ReactNode } from 'react';

import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
import { CurrencyCombobox } from '@/components/shared/currency-combobox';
import { ChoiceChips, Field, FormError, SelectField, TextareaField } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
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

/** One section of the form: a heading, a line of context, then its fields. */
function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="px-5 py-6 sm:px-6">
      <h2 id={id} className="text-base font-semibold tracking-tight">
        {title}
      </h2>
      {description && <p className="mt-0.5 text-sm text-text-subtle">{description}</p>}
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  );
}

/**
 * One form for creating and editing, in four sections (the brief, the skills, the terms, the
 * logistics) in the order someone thinks about a job.
 *
 * ONE SURFACE: the form is a single raised panel with ruled sections, not four stacked cards.
 * The sections are parts of one document, and the only thing that floats is the action bar.
 *
 * Two submit buttons rather than a status dropdown: "save draft" and "publish" are different
 * intents, and making the user set a state field to express one is a worse way to ask. The
 * intent travels as a value on the button itself. The action row is sticky at the bottom of
 * the viewport, so it is reachable from the first field without scrolling a long form.
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
    <Form state={state} action={action} className="space-y-6" noValidate>
      {job?.id ? <input type="hidden" name="jobId" value={String(job.id)} /> : null}

      <div className="divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
        <FormSection
          id="job-form-brief"
          title="The brief"
          description="Matching reads this, and so does every candidate."
        >
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
            rows={8}
            defaultValue={str(job, 'description')}
            errors={fields?.description}
            placeholder="The problem, what done looks like, and anything already tried."
            hint="At least 120 characters. The more specific it is, the better the matches."
          />
          <TextareaField
            label="Requirements"
            name="requirements"
            rows={3}
            optional
            defaultValue={str(job, 'requirements')}
          />
        </FormSection>

        <FormSection
          id="job-form-skills"
          title="Skills"
          description="The first three count as required."
        >
          <div>
            <SkillPicker options={options} initial={initialSkills} max={20} />
            {fields?.skills && (
              <p role="alert" className="mt-1.5 text-sm text-danger">
                {fields.skills[0]}
              </p>
            )}
          </div>
        </FormSection>

        <FormSection id="job-form-terms" title="Terms">
          <ChoiceChips
            legend="Engagement"
            name="engagementType"
            options={ENGAGEMENTS}
            defaultValue={str(job, 'engagement_type') || 'fixed'}
          />
          {/* Phone: the two amounts side by side, currency below them. From sm: one row. */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
            <Field
              label="Budget from"
              name="budgetMin"
              inputMode="decimal"
              defaultValue={str(job, 'budget_min')}
              placeholder="2000"
              className="tabular-nums"
            />
            <Field
              label="Budget to"
              name="budgetMax"
              inputMode="decimal"
              defaultValue={str(job, 'budget_max')}
              placeholder="4000"
              errors={fields?.budgetMax}
              className="tabular-nums"
            />
            <CurrencyCombobox
              defaultValue={str(job, 'currency')}
              errors={fields?.currency}
              className="col-span-2 sm:col-span-1"
            />
          </div>
        </FormSection>

        <FormSection id="job-form-location" title="Location and timing">
          <div className="space-y-4">
            <ChoiceChips
              legend="Location"
              name="locationType"
              options={LOCATIONS}
              value={locationType}
              onChange={setLocationType}
            />
            {/* Only rendered when it is actually required, rather than sitting there disabled. */}
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
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              label="Experience"
              name="experienceLevel"
              id="experienceLevel"
              defaultValue={str(job, 'experience_level')}
            >
              {LEVELS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </SelectField>
            <Field
              label="Deadline"
              name="deadline"
              type="date"
              optional
              defaultValue={str(job, 'deadline').slice(0, 10)}
              errors={fields?.deadline}
              hint="Shown to candidates and used in search listings."
            />
          </div>
        </FormSection>
      </div>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}

      {/* The one floating element on the page, so it is the one with a shadow. */}
      <div className="sticky bottom-[calc(var(--tabbar-space)+0.75rem)] md:bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-sticky flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border-base bg-surface-raised p-3 shadow-md sm:bottom-4 sm:gap-3">
        <p className="mr-auto hidden text-sm text-text-muted sm:block">
          {isPublished ? 'Changes go live when you save.' : 'Drafts are private until you publish.'}
        </p>
        {!isPublished && (
          <SubmitButton
            name="intent"
            value="draft"
            variant="secondary"
            pendingLabel="Saving…"
            className="flex-1 sm:flex-none"
          >
            Save draft
          </SubmitButton>
        )}
        <SubmitButton
          name="intent"
          value="publish"
          pendingLabel="Saving…"
          className="flex-1 sm:flex-none"
        >
          {isPublished ? 'Save changes' : 'Publish'}
        </SubmitButton>
      </div>
    </Form>
  );
}
