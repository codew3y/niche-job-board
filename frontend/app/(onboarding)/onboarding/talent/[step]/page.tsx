import { notFound, redirect } from 'next/navigation';

import { WizardFrame } from '@/components/onboarding/wizard-frame';
import { TalentBasicsForm } from '@/components/onboarding/talent-forms';
import { TalentSkillsForm } from '@/components/onboarding/talent-forms';
import { TalentEvidenceStep } from '@/components/onboarding/talent-evidence';
import { getConnections } from '@techselect/backend/services/connections';
import { TalentReview } from '@/components/onboarding/talent-review';
import {
  TALENT_STEPS,
  talentStepDone,
  type TalentStep,
} from '@techselect/backend/onboarding/steps';
import { createClient } from '@techselect/backend/supabase/server';

export default async function TalentOnboarding({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  if (!TALENT_STEPS.some((s) => s.slug === step)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select(
      'id, headline, bio, timezone, years_experience, hourly_rate_min, hourly_rate_max, currency, availability, website_url, github_url, linkedin_url, portfolio_item_count, is_published',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const [{ data: skills }, { data: mySkills }, { data: items }] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    profile
      ? supabase.from('talent_skills').select('skill_id').eq('talent_id', profile.id)
      : Promise.resolve({ data: [] as { skill_id: string }[] }),
    profile
      ? supabase
          .from('portfolio_items')
          .select('id, title, description, tech_stack')
          .eq('talent_id', profile.id)
          .order('sort_order')
      : Promise.resolve({
          data: [] as { id: string; title: string; description: string; tech_stack: string[] }[],
        }),
  ]);

  const progress = {
    // The title is what the basics step requires; the bio has no minimum.
    hasBasics: Boolean(profile?.headline),
    hasSkills: (mySkills?.length ?? 0) > 0,
    hasEvidence: Boolean(profile?.website_url) || (profile?.portfolio_item_count ?? 0) >= 2,
    isPublished: Boolean(profile?.is_published),
  };

  return (
    <WizardFrame
      steps={TALENT_STEPS}
      current={step}
      basePath="/onboarding/talent"
      done={(slug) => talentStepDone(slug as TalentStep, progress)}
    >
      {step === 'basics' && <TalentBasicsForm profile={profile ?? null} />}
      {step === 'skills' && (
        <TalentSkillsForm
          profile={profile ?? null}
          options={skills ?? []}
          initial={(mySkills ?? []).map((s) => s.skill_id)}
        />
      )}
      {step === 'portfolio' && (
        <TalentEvidenceStep
          profile={profile ?? null}
          items={items ?? []}
          connections={await getConnections()}
        />
      )}
      {step === 'review' && <TalentReview profile={profile ?? null} progress={progress} />}
    </WizardFrame>
  );
}
