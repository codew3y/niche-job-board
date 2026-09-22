import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProfileEditor, SkillsEditor } from '@/components/talent/profile-editor';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { togglePublish } from '@/lib/actions/profile';
import { publishBlockers } from '@/lib/schemas/talent';
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

  // The same function the publish action calls, so the page can never offer something the
  // server would refuse (docs/components.md).
  const blockers = publishBlockers({
    bio: profile.bio ?? '',
    websiteUrl: profile.website_url,
    portfolioItemCount: profile.portfolio_item_count,
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

        <div className="rounded-[--radius] border border-border-base bg-surface-raised p-4">
          {blockers.length > 0 ? (
            <>
              <p className="font-medium">Before you can publish</p>
              <ul className="mt-2 space-y-1 text-sm text-text-muted">
                {blockers.map((b) => (
                  <li key={b}>· {b}</li>
                ))}
              </ul>
              <Link
                href="/dashboard/talent/portfolio"
                className="mt-3 inline-block text-sm text-accent hover:underline"
              >
                Add a project
              </Link>
            </>
          ) : (
            <form
              action={togglePublish}
              className="flex flex-wrap items-center justify-between gap-3"
            >
              <input type="hidden" name="publish" value={profile.is_published ? 'false' : 'true'} />
              <p className="text-sm text-text-muted text-pretty">
                {profile.is_published
                  ? 'Your profile is public and can be matched to briefs.'
                  : 'Ready to publish — clients will be able to find you.'}
              </p>
              <Button
                type="submit"
                variant={profile.is_published ? 'secondary' : 'primary'}
                size="sm"
              >
                {profile.is_published ? 'Unpublish' : 'Publish'}
              </Button>
            </form>
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
