'use client';

import { FileText } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ChoiceChips, Field, FormError, TextareaField } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { CurrencyCombobox } from '@/components/shared/currency-combobox';
import { SubmitButton } from '@/components/ui/submit-button';
import { SkillPicker, type SkillOption } from './skill-picker';
import { StepCard, Submit } from './talent-forms';
import { publishFirstJob, saveCompany, saveFirstJob } from '@/lib/actions/onboarding';
import type { ActionResult } from '@/lib/actions/auth';
import type { ClientProgress } from '@/lib/onboarding/steps';

type Row = Record<string, unknown> | null;
const str = (r: Row, k: string) => (r?.[k] as string | null) ?? '';

/**
 * The first client step, kept plain: nobody has to be a company to hire here. One name, already
 * filled in with the person's own, which is what developers see on the brief. Someone hiring for
 * a business can type its name instead. Website and a line about the work are optional; the
 * industry field lives on the full client profile, not in the way of a first brief.
 */
export function CompanyForm({ client, displayName }: { client: Row; displayName: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveCompany, null);
  const fields = state?.ok === false ? state.fields : undefined;

  return (
    <Form state={state} action={action} className="space-y-6" noValidate>
      <StepCard>
        <Field
          label="Name on your briefs"
          name="companyName"
          required
          autoComplete="name"
          defaultValue={str(client, 'company_name') || displayName}
          errors={fields?.companyName}
          hint="Your own name is fine. Use a business or team name only if you are hiring for one."
        />
        <Field
          label="Website"
          name="website"
          type="url"
          inputMode="url"
          optional
          placeholder="https://example.com"
          defaultValue={str(client, 'website')}
          errors={fields?.website}
        />
        <TextareaField
          label="What you hire for"
          name="about"
          rows={3}
          optional
          defaultValue={str(client, 'about')}
          placeholder="A line or two about the work, so developers know who they would be working with."
        />
      </StepCard>
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <Submit label="Continue" />
    </Form>
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
    <Form state={state} action={action} className="space-y-6" noValidate>
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
          <CurrencyCombobox
            defaultValue={str(job, 'currency')}
            errors={fields?.currency}
            className="col-span-2 sm:col-span-1"
          />
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
    </Form>
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
      <article className="rounded-lg border border-border-base bg-surface-raised p-5 sm:p-7">
        <Badge tone="neutral">Preview</Badge>
        <h2 className="mt-3 font-display text-2xl font-semibold text-balance">
          {str(job, 'title')}
        </h2>
        <p className="mt-3 text-sm whitespace-pre-line text-text-muted">
          {str(job, 'description')}
        </p>
      </article>

      <Form state={state} action={action} className="space-y-4">
        <p className="max-w-xl text-text-muted text-pretty">
          Publishing makes this brief public so developers can find and apply to it. You can close
          it at any time.
        </p>
        {state?.ok === false && <FormError>{state.message}</FormError>}
        <SubmitButton size="lg" className="w-full sm:w-auto" pendingLabel="Publishing…">
          Publish this brief
        </SubmitButton>
      </Form>
    </div>
  );
}
