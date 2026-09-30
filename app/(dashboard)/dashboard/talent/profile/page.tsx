import { Lightbulb } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PortfolioManager } from '@/components/portfolio/portfolio-manager';
import { EducationEditor, ExperienceEditor } from '@/components/talent/history-editors';
import { ProfileEditor, SkillsEditor } from '@/components/talent/profile-editor';
import { ActionForm } from '@/components/ui/action-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { PageHeader } from '@/components/ui/page-header';
import { togglePublish } from '@/lib/actions/profile';
import { profileSuggestions } from '@/lib/schemas/talent';
import type { EducationRow, ExperienceRow } from '@/lib/services/talent';
import { createClient } from '@/lib/supabase/server';
import { requireViewer } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Edit profile' };

/**
 * Edit profile — every section of the developer profile on one page, in the order a client
 * reads them: details (title, rate), links, skills, projects, experience, education.
 *
 * Projects used to have their own page (/dashboard/talent/portfolio); it redirects here now, so
 * there is one place a profile is edited, reached from "Edit profile" in the profile menu.
 */
export default async function ProfilePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select(
      `id, slug, headline, bio, hourly_rate_min, hourly_rate_max, currency, availability,
       years_experience, timezone, website_url, github_url, linkedin_url,
       portfolio_item_count, is_published`,
    )
    .eq('user_id', viewer.userId)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const [
    { data: skills },
    { data: mySkills },
    { data: items },
    { data: experience },
    { data: education },
  ] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    supabase.from('talent_skills').select('skill_id').eq('talent_id', profile.id),
    supabase
      .from('portfolio_items')
      .select(
        `id, title, description, role, outcome, tech_stack, links, sort_order,
           item_media ( id, url, alt_text, sort_order )`,
      )
      .eq('talent_id', profile.id)
      .order('sort_order'),
    supabase
      .from('talent_experience')
      .select('id, role, company, start_date, end_date, description, sort_order')
      .eq('talent_id', profile.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('talent_education')
      .select('id, school, degree, start_year, end_year, sort_order')
      .eq('talent_id', profile.id)
      .order('end_year', { ascending: false, nullsFirst: true }),
  ]);

  /**
   * Suggestions, not blockers. Nothing here can prevent publishing (ADR-008) — the publish
   * button is always live, and this panel sits alongside it rather than in front of it.
   */
  const suggestions = profileSuggestions({
    bio: profile.bio ?? '',
    websiteUrl: profile.website_url,
    portfolioItemCount: profile.portfolio_item_count,
    skillCount: (mySkills ?? []).length,
  });

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Edit profile"
        subtitle={
          <>
            {profile.is_published ? 'Public at ' : 'Draft — only you can see '}
            <Link href={`/talent/${profile.slug}`} className="prose-link text-text">
              /talent/{profile.slug}
            </Link>
          </>
        }
      />

      <Card className="p-5 sm:p-6">
        {/* The publish control comes FIRST and is never conditional. Putting advice above a
            button people are entitled to press reads as a gate even when it is not one. */}
        <ActionForm
          action={togglePublish}
          success={profile.is_published ? 'Profile unpublished' : 'Profile published'}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <input type="hidden" name="publish" value={profile.is_published ? 'false' : 'true'} />
          <div className="flex min-w-0 items-center gap-3">
            <Badge tone={profile.is_published ? 'success' : 'outline'} size="md">
              {profile.is_published ? 'Published' : 'Draft'}
            </Badge>
            <p className="text-sm text-text-muted text-pretty">
              {profile.is_published
                ? 'Public, and matched to new briefs.'
                : 'Publish whenever you like — you can keep editing afterwards.'}
            </p>
          </div>
          <SubmitButton
            variant={profile.is_published ? 'secondary' : 'accent'}
            size="sm"
            pendingLabel={profile.is_published ? 'Unpublishing…' : 'Publishing…'}
          >
            {profile.is_published ? 'Unpublish' : 'Publish'}
          </SubmitButton>
        </ActionForm>

        {suggestions.length > 0 && (
          <div className="mt-5 border-t border-border-base pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb aria-hidden="true" size={16} className="text-accent" />
              Would help you land better
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-text-muted">
              {suggestions.map((s) => (
                <li key={s} className="text-pretty">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Details" description="Title, rate, and what matching reads." />
        <div className="p-5 sm:p-6">
          <ProfileEditor profile={profile} />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Skills"
          description="Pick from the list — only the ones you would take work in."
        />
        <div className="p-5 sm:p-6">
          <SkillsEditor options={skills ?? []} initial={(mySkills ?? []).map((s) => s.skill_id)} />
        </div>
      </Card>

      <Card id="projects" className="scroll-mt-8">
        <CardHeader title="Projects" description="Title, a short description, links and photos." />
        <div className="p-5 sm:p-6">
          <PortfolioManager items={items ?? []} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Experience" />
        <div className="p-5 sm:p-6">
          <ExperienceEditor rows={(experience ?? []) as ExperienceRow[]} />
        </div>
      </Card>

      <Card>
        <CardHeader title="Education" />
        <div className="p-5 sm:p-6">
          <EducationEditor rows={(education ?? []) as EducationRow[]} />
        </div>
      </Card>
    </div>
  );
}
