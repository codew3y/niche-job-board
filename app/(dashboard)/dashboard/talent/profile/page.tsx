import { CheckCircle, FileArrowUp, Lightbulb } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PortfolioManager } from '@/components/portfolio/portfolio-manager';
import {
  CertificationEditor,
  EducationEditor,
  ExperienceEditor,
} from '@/components/talent/history-editors';
import { ProfileEditor, SkillsEditor } from '@/components/talent/profile-editor';
import { getConnections } from '@/lib/services/connections';
import { ActionForm } from '@/components/ui/action-form';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SubmitButton } from '@/components/ui/submit-button';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { setAcceptsMessages, togglePublish } from '@/lib/actions/profile';
import { profileSuggestions } from '@/lib/schemas/talent';
import type { CertificationRow, EducationRow, ExperienceRow } from '@/lib/services/talent';
import { createClient } from '@/lib/supabase/server';
import { requireViewer } from '@/lib/supabase/session';

export const metadata: Metadata = { title: 'Edit profile' };

/**
 * Edit profile: every section of the developer profile on one page, in the order a client
 * reads them: details (title, rate), links, skills, projects, experience, education.
 *
 * Projects used to have their own page (/dashboard/talent/portfolio); it redirects here now, so
 * there is one place a profile is edited, reached from "Edit profile" in the profile menu.
 * The `#projects` anchor that redirect targets is the Projects section's id.
 */
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ imported?: string; skipped?: string }>;
}) {
  // Set by applyResume (lib/actions/resume-import.ts) on its way back here.
  const { imported, skipped } = await searchParams;
  const importedCount = Number(imported);
  const skippedCount = Number(skipped) || 0;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const connections = await getConnections();

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select(
      `id, slug, headline, bio, hourly_rate_min, hourly_rate_max, currency, availability,
       years_experience, timezone, website_url, github_url, linkedin_url,
       portfolio_item_count, is_published, accepts_messages`,
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
    { data: certifications },
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
    supabase
      .from('talent_certifications')
      .select(
        'id, name, issuer, issued_on, expires_on, credential_id, verification_url, sort_order',
      )
      .eq('talent_id', profile.id)
      .order('issued_on', { ascending: false }),
  ]);

  /**
   * Suggestions, not blockers. Nothing here can prevent publishing (ADR-008): the publish
   * button is always live, and this panel sits alongside it rather than in front of it.
   */
  const suggestions = profileSuggestions({
    bio: profile.bio ?? '',
    websiteUrl: profile.website_url,
    portfolioItemCount: profile.portfolio_item_count,
    skillCount: (mySkills ?? []).length,
  });

  const sections = [
    { id: 'details', title: 'Details', description: 'Title, rate, and the text matching reads.' },
    {
      id: 'skills',
      title: 'Skills',
      description: 'Pick from the list. Choose only the ones you would take work in.',
    },
    {
      id: 'projects',
      title: 'Projects',
      description: 'Title, a short description, links and photos.',
    },
    { id: 'experience', title: 'Experience', description: 'Roles a client should know about.' },
    {
      id: 'certifications',
      title: 'Certifications',
      description:
        'Optional. Each one shows on your profile, with a link to verify it if you add one.',
    },
    { id: 'education', title: 'Education', description: 'Optional. Add it if it helps.' },
  ] as const;

  const body: Record<(typeof sections)[number]['id'], React.ReactNode> = {
    details: <ProfileEditor profile={profile} connections={connections} />,
    skills: (
      <SkillsEditor options={skills ?? []} initial={(mySkills ?? []).map((s) => s.skill_id)} />
    ),
    projects: <PortfolioManager items={items ?? []} />,
    experience: <ExperienceEditor rows={(experience ?? []) as ExperienceRow[]} />,
    certifications: <CertificationEditor rows={(certifications ?? []) as CertificationRow[]} />,
    education: <EducationEditor rows={(education ?? []) as EducationRow[]} />,
  };

  return (
    <div className="xl:grid xl:grid-cols-[10rem_minmax(0,1fr)] xl:gap-10">
      {/* A section index for a long page, from xl only (below that the sidebar leaves too little
          width for two columns). Narrower, the page is one column and the sections follow each
          other; an index there would only push the form down. */}
      <nav aria-label="Profile sections" className="hidden xl:block">
        <ul className="sticky top-12 space-y-0.5 text-sm">
          {sections.map((sec) => (
            <li key={sec.id}>
              <a
                href={`#${sec.id}`}
                className="flex h-10 items-center rounded-md px-3 font-medium text-text-muted transition-colors duration-fast ease-out hover:bg-surface-sunken hover:text-text"
              >
                {sec.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 max-w-3xl">
        <PageHeader
          title="Edit profile"
          subtitle={
            <>
              {profile.is_published ? 'Public at ' : 'Draft. Only you can see '}
              <Link href={`/talent/${profile.slug}`} className="prose-link break-all text-text">
                /talent/{profile.slug}
              </Link>
            </>
          }
          actions={
            <Link
              href="/dashboard/talent/profile/import"
              className={buttonStyles({ variant: 'secondary' })}
            >
              <FileArrowUp aria-hidden="true" />
              Import from resume
            </Link>
          }
        />

        {Number.isFinite(importedCount) && imported !== undefined && (
          <p
            role="status"
            className="mb-8 flex items-start gap-3 rounded-lg bg-success-subtle p-4 text-sm text-text"
          >
            <CheckCircle aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-success" />
            <span className="text-pretty">
              {importedCount > 0
                ? `Added ${importedCount} ${importedCount === 1 ? 'item' : 'items'} from your resume. Check them below and edit anything that needs it.`
                : 'Nothing was added from your resume.'}
              {skippedCount > 0 &&
                ` ${skippedCount} could not be added as they were (usually a missing date or a short description); add those by hand.`}
            </span>
          </p>
        )}

        {/* The one elevated panel on the page: publishing is the decision everything else
            feeds. The publish control comes FIRST and is never conditional. Putting advice
            above a button people are entitled to press reads as a gate even when it is not
            one. */}
        <Card className="p-5 sm:p-6">
          <ActionForm
            action={togglePublish}
            success={profile.is_published ? 'Profile unpublished' : 'Profile published'}
            className="flex flex-wrap items-center justify-between gap-4"
          >
            <input type="hidden" name="publish" value={profile.is_published ? 'false' : 'true'} />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Badge tone={profile.is_published ? 'success' : 'outline'} size="md">
                {profile.is_published ? 'Published' : 'Draft'}
              </Badge>
              <p className="min-w-0 text-sm text-text-muted text-pretty">
                {profile.is_published
                  ? 'Public, and matched to new jobs.'
                  : 'Publish whenever you like. You can keep editing afterwards.'}
              </p>
            </div>
            {/* Draft: Publish is the page's one primary action. Published: Unpublish steps
                down to secondary, and Save profile becomes the primary. */}
            <SubmitButton
              variant={profile.is_published ? 'secondary' : 'primary'}
              pendingLabel={profile.is_published ? 'Unpublishing…' : 'Publishing…'}
            >
              {profile.is_published ? 'Unpublish' : 'Publish'}
            </SubmitButton>
          </ActionForm>

          {/* New messages on or off: the terms promise developers can turn them off. Enforced by
              the database (conversations_insert_client), not only by hiding the button. */}
          <ActionForm
            action={setAcceptsMessages}
            success={
              profile.accepts_messages ? 'New messages turned off' : 'New messages turned on'
            }
            className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-border-base pt-5"
          >
            <input
              type="hidden"
              name="accepts"
              value={profile.accepts_messages ? 'false' : 'true'}
            />
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Badge tone={profile.accepts_messages ? 'success' : 'outline'} size="md">
                {profile.accepts_messages ? 'Messages on' : 'Messages off'}
              </Badge>
              <p className="min-w-0 text-sm text-text-muted text-pretty">
                {profile.accepts_messages
                  ? 'Clients can message you from your profile.'
                  : 'Clients cannot start new conversations with you. Conversations you already have stay open; block someone to end one.'}
              </p>
            </div>
            <SubmitButton
              variant="secondary"
              pendingLabel={profile.accepts_messages ? 'Turning off…' : 'Turning on…'}
            >
              {profile.accepts_messages ? 'Turn off messages' : 'Turn on messages'}
            </SubmitButton>
          </ActionForm>

          {suggestions.length > 0 && (
            <div className="mt-5 border-t border-border-base pt-5">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Lightbulb aria-hidden="true" size={16} className="text-link" />
                Would help you land better
              </p>
              <ul className="mt-2 list-disc space-y-1.5 pl-9 text-sm text-text-muted marker:text-text-subtle">
                {suggestions.map((s) => (
                  <li key={s} className="text-pretty">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* The sections are separated by rules and space, not boxed: they are parts of one
            document, and six cards in a column read as a pile. */}
        <div className="mt-10 divide-y divide-border-base">
          {sections.map((sec) => (
            <section
              key={sec.id}
              id={sec.id}
              aria-labelledby={`${sec.id}-heading`}
              className="scroll-mt-8 py-8 first:pt-0"
            >
              <SectionHeading
                id={`${sec.id}-heading`}
                title={sec.title}
                description={sec.description}
              />
              {body[sec.id]}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
