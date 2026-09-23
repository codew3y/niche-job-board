'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { LinksPreview } from './links-preview';
import { SkillPicker, type SkillOption } from '@/components/onboarding/skill-picker';
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

export function ProfileEditor({ profile }: { profile: Profile }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateProfile, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-5" noValidate>
      <Field
        label="Headline"
        name="headline"
        required
        defaultValue={str(profile, 'headline')}
        errors={fields?.headline}
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
          className={`w-full rounded-[--radius] border bg-surface-raised p-3
            ${fields?.bio ? 'border-danger' : 'border-border-strong'}`}
        />
        <p id="bio-hint" className={`text-sm ${fields?.bio ? 'text-danger' : 'text-text-muted'}`}>
          {fields?.bio?.[0] ?? 'At least 120 characters — this is the text matching reads.'}
        </p>
      </div>

      <LinksPreview
        initial={{
          website: str(profile, 'website_url'),
          github: str(profile, 'github_url'),
          linkedin: str(profile, 'linkedin_url'),
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
            {['USD', 'EUR', 'GBP', 'CHF'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <label htmlFor="availability" className="block text-sm font-medium">
            Availability
          </label>
          <select
            id="availability"
            name="availability"
            defaultValue={str(profile, 'availability') || 'part_time'}
            className="h-11 w-full rounded-[--radius] border border-border-strong bg-surface-raised px-3"
          >
            {AVAILABILITY.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <Field
          label="Years"
          name="yearsExperience"
          type="number"
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

      {state?.ok === false && (
        <p
          role="alert"
          className="rounded-[--radius-sm] bg-danger-subtle p-3 text-sm text-danger text-pretty"
        >
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success">
          Saved.
        </p>
      )}

      <SaveProfile />
    </form>
  );
}

export function SkillsEditor({ options, initial }: { options: SkillOption[]; initial: string[] }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(updateSkills, null);

  return (
    <form action={action} className="space-y-4">
      <SkillPicker options={options} initial={initial} />
      {state?.ok === false && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-sm text-success">
          Skills saved.
        </p>
      )}
      <SaveSkills />
    </form>
  );
}

function SaveProfile() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : 'Save profile'}
    </Button>
  );
}
function SaveSkills() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : 'Save skills'}
    </Button>
  );
}
