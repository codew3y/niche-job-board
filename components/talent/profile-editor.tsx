'use client';

import { useActionState } from 'react';

import { Field, FormError, FormStatus, SelectField, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { LinksPreview } from './links-preview';
import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
import { CURRENCIES } from '@/components/onboarding/talent-forms';
import { updateProfile, updateSkills } from '@/lib/actions/profile';
import type { ActionResult } from '@/lib/actions/auth';

type Profile = Record<string, unknown>;
const str = (p: Profile, k: string) => (p[k] as string | null) ?? '';

const AVAILABILITY = [
  ['full_time', 'Full time'],
  ['part_time', 'Part time'],
  ['occasional', 'Occasional'],
  ['unavailable', 'Not available'],
] as const;

/**
 * The profile form. Confirms inline ("Saved." beside the button) rather than with a toast: the
 * form is long, the confirmation belongs next to the button that was pressed, and a toast in the
 * corner as well would announce the same event twice.
 */
export function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      <Field
        label="Headline"
        name="headline"
        required
        defaultValue={str(profile, 'headline')}
        errors={fields?.headline}
      />

      <TextareaField
        label="About your work"
        name="bio"
        rows={7}
        defaultValue={str(profile, 'bio')}
        errors={fields?.bio}
        hint="At least 120 characters — this is the text matching reads."
      />

      <LinksPreview
        initial={{
          website: str(profile, 'website_url'),
          github: str(profile, 'github_url'),
          linkedin: str(profile, 'linkedin_url'),
        }}
      />

      <div className="grid gap-5 sm:grid-cols-3">
        <Field
          label="Rate from"
          name="hourlyRateMin"
          inputMode="decimal"
          defaultValue={str(profile, 'hourly_rate_min')}
        />
        <Field
          label="Rate to"
          name="hourlyRateMax"
          inputMode="decimal"
          defaultValue={str(profile, 'hourly_rate_max')}
          errors={fields?.hourlyRateMax}
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

      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          label="Availability"
          name="availability"
          defaultValue={str(profile, 'availability') || 'part_time'}
        >
          {AVAILABILITY.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </SelectField>
        <Field
          label="Years"
          name="yearsExperience"
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          defaultValue={(profile.years_experience as number | null) ?? ''}
        />
        <Field
          label="Time zone"
          name="timezone"
          defaultValue={str(profile, 'timezone')}
          placeholder="Europe/Zurich"
        />
      </div>

      {state?.ok === false && <FormError>{state.message}</FormError>}

      <div className="flex flex-wrap items-center gap-4 border-t border-border-base pt-5">
        <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
        {state?.ok && <FormStatus>Saved.</FormStatus>}
      </div>
    </form>
  );
}

export function SkillsEditor({ options, initial }: { options: SkillOption[]; initial: string[] }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateSkills, null);

  return (
    <form action={action} className="space-y-5">
      <SkillPicker options={options} initial={initial} />
      {state?.ok === false && <FormError>{state.message}</FormError>}
      <div className="flex flex-wrap items-center gap-4 border-t border-border-base pt-5">
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save skills
        </SubmitButton>
        {state?.ok && <FormStatus>Skills saved.</FormStatus>}
      </div>
    </form>
  );
}
