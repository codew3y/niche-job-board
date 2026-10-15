import { notFound, redirect } from 'next/navigation';

import { WizardFrame } from '@/components/onboarding/wizard-frame';
import { CompanyForm, FirstJobForm, ClientReview } from '@/components/onboarding/client-forms';
import {
  CLIENT_STEPS,
  clientStepDone,
  type ClientStep,
} from '@techselect/backend/onboarding/steps';
import { createClient } from '@techselect/backend/supabase/server';

export default async function ClientOnboarding({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!CLIENT_STEPS.some((s) => s.slug === step)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: client }, { data: me }] = await Promise.all([
    supabase
      .from('client_profiles')
      .select('id, company_name, website, industry, about')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('user_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
  ]);

  const [{ data: skills }, { data: draft }, { data: published }] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    client
      ? supabase
          .from('jobs')
          .select(
            'id, title, description, requirements, engagement_type, budget_min, budget_max, currency, location_type, location',
          )
          .eq('client_id', client.id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    client
      ? supabase
          .from('jobs')
          .select('id')
          .eq('client_id', client.id)
          .neq('status', 'draft')
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const { data: jobSkills } = draft
    ? await supabase.from('job_skills').select('skill_id').eq('job_id', draft.id)
    : { data: [] as { skill_id: string }[] };

  const progress = {
    hasCompany: Boolean(client?.company_name),
    hasJobDraft: Boolean(draft),
    hasPublishedJob: Boolean(published),
  };

  return (
    <WizardFrame
      steps={CLIENT_STEPS}
      current={step}
      basePath="/onboarding/client"
      done={(slug) => clientStepDone(slug as ClientStep, progress)}
    >
      {step === 'company' && (
        <CompanyForm client={client ?? null} displayName={me?.display_name ?? ''} />
      )}
      {step === 'job' && (
        <FirstJobForm
          job={draft ?? null}
          options={skills ?? []}
          initial={(jobSkills ?? []).map((s) => s.skill_id)}
        />
      )}
      {step === 'review' && <ClientReview job={draft ?? null} progress={progress} />}
    </WizardFrame>
  );
}
