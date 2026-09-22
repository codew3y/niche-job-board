import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProfileEditor, SkillsEditor } from '@/components/talent/profile-editor';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { togglePublish } from '@/lib/actions/profile';
import { profileSuggestions } from '@/lib/schemas/talent';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select(
      `id, slug, headline, bio, hourly_rate_min, hourly_rate_max, currency, availability,
       years_experience, timezone, website_url, github_url, linkedin_url,
       portfolio_item_count, is_published`,
    )
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const [{ data: skills }, { data: mySkills }] = await Promise.all([
    supabase.from('skills').select('id, name, category, aliases').order('name'),
    supabase.from('talent_skills').select('skill_id').eq('talent_id', profile.id),
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
    <div className="max-w-2xl space-y-10">
      <div>
        <PageHeader
          title="Profile"
          subtitle={
            profile.is_published ? (
              <>
                Live at{' '}
                <Link href={`/talent/${profile.slug}`} className="text-accent hover:underline">
                  /talent/{profile.slug}
                </Link>
              </>
            ) : (
              'Draft — only you can see it.'
            )
          }
        />

        <div className="space-y-4 rounded-[--radius] border border-border-base bg-surface-raised p-4">
          {/* The publish control comes FIRST and is never conditional. Putting advice above a
              button people are entitled to press reads as a gate even when it is not one. */}
          <form
            action={togglePublish}
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <input type="hidden" name="publish" value={profile.is_published ? 'false' : 'true'} />
            <p className="text-sm text-text-muted text-pretty">
              {profile.is_published
                ? 'Your profile is public and can be matched to briefs.'
                : 'Publish whenever you like — you can keep editing afterwards.'}
            </p>
            <Button
              type="submit"
              variant={profile.is_published ? 'secondary' : 'primary'}
              size="sm"
            >
              {profile.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          </form>

          {suggestions.length > 0 && (
            <div className="border-t border-border-base pt-3">
              <p className="text-sm font-medium">Would help you land better</p>
              <ul className="mt-2 space-y-1 text-sm text-text-muted">
                {suggestions.map((s) => (
                  <li key={s} className="text-pretty">
                    · {s}
                  </li>
                ))}
              </ul>
              <Link
                href="/dashboard/talent/portfolio"
                className="mt-3 inline-block text-sm text-accent hover:underline"
              >
                Add a project
              </Link>
            </div>
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-4 font-medium">Details</h2>
        <ProfileEditor profile={profile} />
      </section>

      <section>
        <h2 className="mb-4 font-medium">Skills</h2>
        <SkillsEditor options={skills ?? []} initial={(mySkills ?? []).map((s) => s.skill_id)} />
      </section>
    </div>
  );
}
