'use client';

import { useActionState } from 'react';

import { ChoiceChips, Field, FormError, SelectField, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { SkillPicker, type SkillOption } from './skill-picker';
import { saveTalentBasics, saveTalentSkills } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';

type Profile = Record<string, unknown> | null;
const str = (p: Profile, k: string) => (p?.[k] as string | null) ?? '';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'] as const;

/** The step's form body: fields in a card, the action row below it. */
export function StepCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6 rounded-lg border border-border-base bg-surface-raised p-5 sm:p-7">
      {children}
    </div>
  );
}

export function TalentBasicsForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveTalentBasics, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      <StepCard>
        <Field
          label="Headline"
          name="headline"
          defaultValue={str(profile, 'headline')}
          placeholder="Payments and serverless developer"
          required
          errors={fields?.headline}
          hint="One line. What you do, not your job title."
        />

        {/* Said plainly because it is true and it changes behaviour: this text is what the
            embedding reads. People write more when they know why. */}
        <TextareaField
          label="About your work"
          name="bio"
          rows={7}
          defaultValue={str(profile, 'bio')}
          errors={fields?.bio}
          placeholder="What do you build? What stack? What kind of client? Name a piece of work you're proud of."
          hint="At least 120 characters — this is the text matching actually reads."
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Years of experience"
            name="yearsExperience"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            optional
            defaultValue={(profile?.years_experience as number | null) ?? ''}
          />
          <Field
            label="Time zone"
            name="timezone"
            optional
            defaultValue={str(profile, 'timezone')}
            placeholder="Europe/Zurich"
          />
        </div>
      </StepCard>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </form>
  );
}

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
      <StepCard>
        <SkillPicker options={options} initial={initial} />

        <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
          {/* One rate, stored as min = max — the same as the profile editor. */}
          <Field
            label="Hourly rate"
            name="hourlyRate"
            inputMode="decimal"
            optional
            defaultValue={str(profile, 'hourly_rate_min') || str(profile, 'hourly_rate_max')}
            placeholder="85"
            errors={fields?.hourlyRate}
          />
          <SelectField
            label="Currency"
            name="currency"
            defaultValue={str(profile, 'currency') || 'USD'}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>

        <ChoiceChips
          legend="Availability"
          name="availability"
          options={AVAILABILITY}
          defaultValue={str(profile, 'availability') || 'part_time'}
        />
      </StepCard>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </form>
  );
}

export function Submit({ label }: { label: string }) {
  return (
    <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Saving…">
      {label}
    </SubmitButton>
  );
}
