'use client';

import { FileText } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ChoiceChips, Field, FormError, SelectField, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { SkillPicker, type SkillOption } from './skill-picker';
import { CURRENCIES, StepCard, Submit } from './talent-forms';
import { publishFirstJob, saveCompany, saveFirstJob } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { ClientProgress } from '@/lib/onboarding/steps';

type Row = Record<string, unknown> | null;
const str = (r: Row, k: string) => (r?.[k] as string | null) ?? '';

export function CompanyForm({ client }: { client: Row }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCompany, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <form action={action} className="space-y-6" noValidate>
      <StepCard>
        <Field
          label="Company name"
          name="companyName"
          required
          autoComplete="organization"
          defaultValue={str(client, 'company_name')}
          errors={fields?.companyName}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            label="Website"
            name="website"
            type="url"
            inputMode="url"
            optional
            placeholder="https://yourcompany.com"
            defaultValue={str(client, 'website')}
            errors={fields?.website}
          />
          <Field
            label="Industry"
            name="industry"
            optional
            placeholder="Logistics"
            defaultValue={str(client, 'industry')}
          />
        </div>
        <TextareaField
          label="About"
          name="about"
          rows={4}
          optional
          defaultValue={str(client, 'about')}
          placeholder="What the company does, and what you need help with."
        />
      </StepCard>
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
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
  // Location is only required for hybrid/onsite, so the field appears when it becomes relevant
  // rather than sitting there greyed out.
  const [locationType, setLocationType] = useState(str(job, 'location_type') || 'remote');

  return (
    <form action={action} className="space-y-6" noValidate>
      <StepCard>
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
          rows={7}
          defaultValue={str(job, 'description')}
          errors={fields?.description}
          placeholder="The problem, what done looks like, and anything that has already been tried."
          hint="At least 120 characters. A short brief gets poorly matched candidates."
        />
        <SkillPicker options={options} initial={initial} max={20} errors={fields?.skills} />
      </StepCard>

      <StepCard>
        <ChoiceChips
          legend="Engagement"
          name="engagementType"
          options={ENGAGEMENTS}
          defaultValue={str(job, 'engagement_type') || 'fixed'}
        />
        {/* Phone: the two amounts side by side, the currency under them. */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-5">
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
            wrapperClassName="col-span-2 sm:col-span-1"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="space-y-4">
          <ChoiceChips
            legend="Location"
            name="locationType"
            options={LOCATIONS}
            value={locationType}
            onChange={setLocationType}
          />
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
      </StepCard>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </form>
  );
}

export function ClientReview({ job, progress }: { job: Row; progress: ClientProgress }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(publishFirstJob, null);

  if (!progress.hasJobDraft) {
    return (
      <EmptyState
        icon={FileText}
        title="No brief yet"
        body="Write your first brief, then come back here to publish it."
        action={
          <Link href="/onboarding/client/job" className={buttonStyles()}>
            Write your brief
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <article className="rounded-lg border border-border-base bg-surface-raised p-5 shadow-xs sm:p-7">
        <Badge tone="neutral">Preview</Badge>
        <h2 className="mt-3 font-display text-2xl font-semibold text-balance">
          {str(job, 'title')}
        </h2>
        <p className="mt-3 text-sm whitespace-pre-line text-text-muted">
          {str(job, 'description')}
        </p>
      </article>

      <form action={action} className="space-y-4">
        <p className="max-w-xl text-text-muted text-pretty">
          Publishing makes this brief public so developers can find and apply to it. You can close
          it at any time.
        </p>
        {state?.ok === false && <FormError>{state.message}</FormError>}
        <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Publishing…">
          Publish this brief
        </SubmitButton>
      </form>
    </div>
  );
}
