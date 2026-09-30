import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CompanyForm } from '@/components/client/company-form';
import { ExternalLink } from '@/components/shared/external-link';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Company profile' };

/**
 * The company a client posts under.
 *
 * This page did not exist: the name could be set once during onboarding and never changed,
 * while appearing on every job post. "Profile" in the navigation had nowhere to point for a
 * client, which is why the nav had none.
 */
export default async function ClientProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: company } = await supabase
    .from('client_profiles')
    .select('company_name, website, industry, about')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!company) notFound();

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader
        title="Company profile"
        subtitle="What a developer sees before deciding whether to apply."
      />
      {/* "View profile" in the profile menu lands here: the company as it appears on a job
          page. There is no separate public client page, so this is the honest preview. */}
      <Card id="preview" className="scroll-mt-8 p-5 sm:p-6">
        <p className="text-sm text-text-subtle">How developers see you</p>
        <div className="mt-3 flex items-start gap-4">
          <Avatar name={company.company_name} />
          <div className="min-w-0">
            <p className="font-semibold">{company.company_name}</p>
            {(company.industry || company.website) && (
              <p className="text-sm text-text-subtle">
                {company.industry}
                {company.industry && company.website ? ' · ' : ''}
                <ExternalLink href={company.website}>
                  {company.website?.replace(/^https:\/\//, '')}
                </ExternalLink>
              </p>
            )}
            {company.about && (
              <p className="mt-2 whitespace-pre-line text-text-muted text-pretty">
                {company.about}
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card id="edit" className="scroll-mt-8 p-5 sm:p-6">
        <CompanyForm company={company} />
      </Card>

      <div className="space-y-2 text-sm text-text-muted">
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
    </div>
  );
}
