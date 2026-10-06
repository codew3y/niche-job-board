'use client';

import { useActionState } from 'react';

import { Field, FormError, FormStatus, SelectField, TextareaField } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConnectedAccounts } from './connected-accounts';
import { LinksPreview } from './links-preview';
import type { Connections } from '@/lib/services/connections';
import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
import { CurrencySelect } from '@/components/shared/currency-select';
import { TimezoneCombobox } from '@/components/shared/timezone-combobox';
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
export function ProfileEditor({
  profile,
  connections,
}: {
  profile: Profile;
  connections: Connections;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <Form state={state} action={action} className="space-y-6" noValidate>
      <Field
        label="Title"
        name="headline"
        required
        defaultValue={str(profile, 'headline')}
        errors={fields?.headline}
        placeholder="Full-stack developer, Next.js and Stripe"
      />

      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        {/* One rate, stored as min = max (see updateProfile). An existing range shows its low
            end, which is what the old "from" field meant. */}
        <Field
          label="Hourly rate"
          name="hourlyRate"
          inputMode="decimal"
          optional
          defaultValue={str(profile, 'hourly_rate_min') || str(profile, 'hourly_rate_max')}
          errors={fields?.hourlyRate}
          placeholder="85"
        />
        <CurrencySelect defaultValue={str(profile, 'currency')} />
      </div>

      <TextareaField
        label="About your work"
        name="bio"
        rows={7}
        defaultValue={str(profile, 'bio')}
        errors={fields?.bio}
        optional
        hint="Any length. This is the text matching reads, so a few sentences on what you build help."
      />

      <LinksPreview initial={{ website: str(profile, 'website_url') }} />

      <ConnectedAccounts
        connections={connections}
        linkedinUrl={str(profile, 'linkedin_url')}
        linkedinErrors={fields?.linkedinUrl}
      />

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
          label="Years of experience"
          name="yearsExperience"
          type="number"
          inputMode="numeric"
          min={0}
          max={60}
          defaultValue={(profile.years_experience as number | null) ?? ''}
        />
        <TimezoneCombobox defaultValue={str(profile, 'timezone')} errors={fields?.timezone} />
      </div>

      {state?.ok === false && <FormError>{state.message}</FormError>}

      <div className="flex flex-wrap items-center gap-4 border-t border-border-base pt-5">
        {/* Primary once the profile is live. While it is a draft, Publish (above) is the page's
            one primary action, so this steps down to secondary. */}
        <SubmitButton
          variant={profile.is_published ? 'primary' : 'secondary'}
          pendingLabel="Saving…"
        >
          Save profile
        </SubmitButton>
        {state?.ok && <FormStatus>Saved.</FormStatus>}
      </div>
    </Form>
  );
}

export function SkillsEditor({ options, initial }: { options: SkillOption[]; initial: string[] }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateSkills, null);

  return (
    <Form state={state} action={action} className="space-y-5">
      <SkillPicker options={options} initial={initial} />
      {state?.ok === false && <FormError>{state.message}</FormError>}
      <div className="flex flex-wrap items-center gap-4 border-t border-border-base pt-5">
        <SubmitButton variant="secondary" pendingLabel="Saving…">
          Save skills
        </SubmitButton>
        {state?.ok && <FormStatus>Skills saved.</FormStatus>}
      </div>
    </Form>
  );
}
