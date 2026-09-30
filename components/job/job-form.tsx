'use client';

import { useActionState, useState } from 'react';

import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
import { CURRENCIES } from '@/components/onboarding/talent-forms';
import { Card, CardHeader } from '@/components/ui/card';
import { ChoiceChips, Field, FormError, SelectField, TextareaField } from '@/components/ui/field';
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

/**
 * One form for creating and editing, in four sections — the brief, the skills, the terms,
 * the logistics — in the order someone thinks about a job.
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
    <form action={action} className="space-y-6" noValidate>
      {job?.id ? <input type="hidden" name="jobId" value={String(job.id)} /> : null}

      <Card>
        <CardHeader
          title="The brief"
          description="What matching reads, and what candidates judge."
        />
        <div className="space-y-6 p-5 sm:p-6">
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
            hint="At least 120 characters — this is what matching reads, and what candidates judge."
          />
          <TextareaField
            label="Requirements"
            name="requirements"
            rows={3}
            optional
            defaultValue={str(job, 'requirements')}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Skills" description="The first three count as required." />
        <div className="p-5 sm:p-6">
          <SkillPicker options={options} initial={initialSkills} max={20} />
          {fields?.skills && <p className="mt-1.5 text-sm text-danger">{fields.skills[0]}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Terms" />
        <div className="space-y-6 p-5 sm:p-6">
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
        </div>
      </Card>

      <Card>
        <CardHeader title="Location and timing" />
        <div className="space-y-6 p-5 sm:p-6">
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
          <div className="grid gap-5 sm:grid-cols-2">
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
        </div>
      </Card>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-sticky flex flex-wrap items-center justify-end gap-3 rounded-lg border border-border-base bg-surface-raised/95 p-3 shadow-md backdrop-blur-md sm:bottom-4">
        <p className="mr-auto hidden text-sm text-text-subtle sm:block">
          {isPublished ? 'Changes go live when you save.' : 'Drafts are private until you publish.'}
        </p>
        {!isPublished && (
          <SubmitButton name="intent" value="draft" variant="secondary" pendingLabel="Saving…">
            Save draft
          </SubmitButton>
        )}
        <SubmitButton name="intent" value="publish" variant="accent" pendingLabel="Saving…">
          {isPublished ? 'Save changes' : 'Publish'}
        </SubmitButton>
      </div>
    </form>
  );
}
