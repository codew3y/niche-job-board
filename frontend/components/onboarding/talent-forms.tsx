'use client';

import { useActionState } from 'react';

import { ChoiceChips, Field, FormError, TextareaField } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { SkillPicker, type SkillOption } from './skill-picker';
import { saveTalentBasics, saveTalentSkills } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import { CurrencyCombobox } from '@/components/shared/currency-combobox';
import { TimezoneCombobox } from '@/components/shared/timezone-combobox';

type Profile = Record<string, unknown> | null;
const str = (p: Profile, k: string) => (p?.[k] as string | null) ?? '';

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
    <Form state={state} action={action} className="space-y-6" noValidate>
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
          optional
          hint="Any length. This is the text matching reads, so a few sentences on what you build help."
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
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
          <TimezoneCombobox defaultValue={str(profile, 'timezone')} errors={fields?.timezone} />
        </div>
      </StepCard>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </Form>
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
    <Form state={state} action={action} className="space-y-6" noValidate>
      <StepCard>
        <SkillPicker options={options} initial={initial} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_8rem]">
          {/* One rate, stored as min = max: the same as the profile editor. */}
          <Field
            label="Hourly rate"
            name="hourlyRate"
            inputMode="decimal"
            optional
            defaultValue={str(profile, 'hourly_rate_min') || str(profile, 'hourly_rate_max')}
            placeholder="85"
            errors={fields?.hourlyRate}
          />
          <CurrencyCombobox defaultValue={str(profile, 'currency')} errors={fields?.currency} />
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
    </Form>
  );
}

/** The step's one forward action. Full width on a phone, where it is the thumb's target. */
export function Submit({ label }: { label: string }) {
  return (
    <div className="flex justify-end">
      <SubmitButton size="lg" className="w-full sm:w-auto sm:min-w-40" pendingLabel="Saving…">
        {label}
      </SubmitButton>
    </div>
  );
}
