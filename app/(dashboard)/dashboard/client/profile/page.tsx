import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CompanyForm } from '@/components/client/company-form';
import { PhotoUpload } from '@/components/upload/photo-upload';
import { ExternalLink } from '@/components/shared/external-link';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { buttonStyles } from '@/components/ui/button';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Company profile' };

/**
 * The company a client posts under.
 *
 * This page did not exist: the name could be set once during onboarding and never changed,
 * while appearing on every job post. "Profile" in the navigation had nowhere to point for a
 * client, which is why the nav had none.
 *
 * Two parts: the preview (a card, because it stands for a thing that appears elsewhere) and the
 * form (plain, on the page). Phone: stacked, preview first. From lg: the form on the left and
 * the preview beside it, sticky, so an edit and its result are on screen together.
 */
export default async function ClientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: company } = await supabase
    .from('client_profiles')
    .select('id, company_name, website, industry, about, logo_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!company) notFound();

  return (
    <div>
      <PageHeader
        title="Company profile"
        subtitle="What a developer sees before deciding whether to apply."
        actions={
          <Link href={`/company/${company.id}`} className={buttonStyles({ variant: 'secondary' })}>
            View public page
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-start">
        {/* "Edit profile" in the profile menu lands here. The preview is the company as it
            appears on a job page; the full public page is /company/<id> ("View public page"). */}
        <section
          id="preview"
          aria-labelledby="preview-heading"
          className="scroll-mt-8 lg:sticky lg:top-8 lg:col-start-2 lg:row-start-1"
        >
          <h2 id="preview-heading" className="mb-3 text-sm font-semibold text-text-muted">
            How developers see you
          </h2>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={company.company_name} src={company.logo_url} />
              <div className="min-w-0">
                <p className="font-semibold break-words">{company.company_name}</p>
                {company.industry && <p className="text-sm text-text-subtle">{company.industry}</p>}
              </div>
            </div>
            {company.about ? (
              <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-text-muted text-pretty">
                {company.about}
              </p>
            ) : (
              <p className="mt-4 text-sm text-text-subtle text-pretty">
                No description yet. Developers see only your name until you add one.
              </p>
            )}
            {company.website && (
              <p className="mt-3 text-sm break-all">
                <ExternalLink href={company.website} className="font-semibold">
                  {company.website.replace(/^https:\/\//, '')}
                </ExternalLink>
              </p>
            )}
          </Card>
        </section>

        <section
          id="edit"
          aria-labelledby="edit-heading"
          className="scroll-mt-8 lg:col-start-1 lg:row-start-1"
        >
          <SectionHeading id="edit-heading" title="Details" />
          <div className="mb-8">
            <PhotoUpload kind="logo" name={company.company_name} current={company.logo_url} />
          </div>
          <CompanyForm company={company} />

          <div className="mt-10 space-y-2 border-t border-border-base pt-6 text-sm text-text-muted">
            <p>
              Looking for your saved developers?{' '}
              <Link href="/dashboard/client/saved" className="prose-link font-semibold">
                They&rsquo;re here
              </Link>
              .
            </p>
            {/* /privacy tells people they can delete their account "from settings", so settings
                has to be reachable from the page they are most likely to be on when they go
                looking. */}
            <p>
              Roles, sign-in address, appearance and deleting your account are in{' '}
              <Link href="/dashboard/settings" className="prose-link font-semibold">
                settings
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
