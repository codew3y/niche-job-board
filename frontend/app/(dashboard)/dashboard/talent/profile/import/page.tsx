import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ResumeImport } from '@/components/talent/resume-import';
import { PageHeader } from '@/components/ui/page-header';
import { safePath } from '@techselect/backend/security/safe-path';
import { createClient } from '@techselect/backend/supabase/server';
import { requireViewer } from '@techselect/backend/supabase/session';

export const metadata: Metadata = { title: 'Import from resume' };

/**
 * Import from resume: upload a PDF, review what was found, add what you choose.
 *
 * Reached from the profile editor and the onboarding evidence step. `returnTo` sends the person
 * back where they came from (a path on this site only).
 */
export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const viewer = await requireViewer();
  const { returnTo } = await searchParams;
  const back = safePath(returnTo) ?? '/dashboard/talent/profile';

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, headline, bio, website_url')
    .eq('user_id', viewer.userId)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const { data: skills } = await supabase
    .from('talent_skills')
    .select('skill_id')
    .eq('talent_id', profile.id);

  return (
    <div>
      <PageHeader
        title="Import from resume"
        subtitle="Upload your resume and we will fill in what we can. You choose what goes on your profile."
      />
      <ResumeImport
        returnTo={back}
        current={{
          headline: profile.headline ?? '',
          bio: profile.bio ?? '',
          website: profile.website_url ?? '',
          skillIds: (skills ?? []).map((s) => s.skill_id),
        }}
      />
    </div>
  );
}
