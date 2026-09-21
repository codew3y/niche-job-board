'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { SkillPicker, type SkillOption } from './skill-picker';
import { saveTalentBasics, saveTalentSkills } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';

type Profile = Record<string, unknown> | null;
const str = (p: Profile, k: string) => (p?.[k] as string | null) ?? '';

export function TalentBasicsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveTalentBasics, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Headline"
        name="headline"
        defaultValue={str(profile, 'headline')}
        placeholder="Payments and serverless developer"
        required
        errors={fields?.headline}
        hint="One line. What you do, not your job title."
      />

      <div className="space-y-1.5">
        <label htmlFor="bio" className="block text-sm font-medium">
          About your work
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={7}
          defaultValue={str(profile, 'bio')}
          aria-invalid={Boolean(fields?.bio)}
          aria-describedby="bio-hint"
          placeholder="What do you build? What stack? What kind of client? Name a piece of work you're proud of."
          className={`w-full rounded-[--radius] border bg-surface-raised p-3 placeholder:text-text-subtle
            ${fields?.bio ? 'border-danger' : 'border-border-strong'}`}
        />
        {/* Said plainly because it is true and it changes behaviour: this text is what the
            embedding reads. Users write more when they know why. */}
        <p id="bio-hint" className={`text-sm ${fields?.bio ? 'text-danger' : 'text-text-muted'}`}>
          {fields?.bio?.[0] ??
            'At least 120 characters — this is the text matching actually reads.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Years of experience"
          name="yearsExperience"
          type="number"
          min={0}
          max={60}
          defaultValue={(profile?.years_experience as number | null) ?? ''}
        />
        <Field
          label="Time zone"
          name="timezone"
          defaultValue={str(profile, 'timezone')}
          placeholder="Europe/Zurich"
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

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'];
const AVAILABILITY = [
  ['full_time', 'Full time'],
  ['part_time', 'Part time'],
  ['occasional', 'Occasional'],
] as const;

export function TalentSkillsForm({
  profile,
  options,
  initial,
}: {
  profile: Profile;
  options: SkillOption[];
  initial: string[];
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveTalentSkills, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      <SkillPicker options={options} initial={initial} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Rate from"
          name="hourlyRateMin"
          inputMode="decimal"
          defaultValue={str(profile, 'hourly_rate_min')}
          placeholder="60"
        />
        <Field
          label="Rate to"
          name="hourlyRateMax"
          inputMode="decimal"
          defaultValue={str(profile, 'hourly_rate_max')}
          placeholder="110"
          errors={fields?.hourlyRateMax}
        />
        <div className="space-y-1.5">
          <label htmlFor="currency" className="block text-sm font-medium">
            Currency
          </label>
          <select
            id="currency"
            name="currency"
            defaultValue={str(profile, 'currency') || 'USD'}
            className="h-11 w-full rounded-[--radius] border border-border-strong bg-surface-raised px-3"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Availability</legend>
        <div className="flex flex-wrap gap-2">
          {AVAILABILITY.map(([value, label]) => (
            <label key={value} className="cursor-pointer">
              <input
                type="radio"
                name="availability"
                value={value}
                defaultChecked={(str(profile, 'availability') || 'part_time') === value}
                className="peer sr-only"
              />
              <span className="inline-block rounded-full border border-border-strong px-4 py-1.5 text-sm transition-colors duration-[--duration-fast] peer-checked:border-accent peer-checked:bg-accent-subtle">
                {label}
              </span>
            </label>
          ))}
        </div>
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

export function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} className="w-full sm:w-auto">
      {pending ? 'Saving…' : label}
    </Button>
  );
}
