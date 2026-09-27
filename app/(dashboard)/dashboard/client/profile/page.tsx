import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { CompanyForm } from '@/components/client/company-form';
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
    .select('company_name, website, industry, company_size, about')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!company) notFound();

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Company profile"
        subtitle="What a developer sees before deciding whether to apply."
      />
      <CompanyForm company={company} />

      <p className="mt-8 border-t border-border-base pt-6 text-sm text-text-muted">
        Looking for your saved developers?{' '}
        <Link href="/dashboard/client/saved" className="text-accent underline underline-offset-2">
          They&rsquo;re here
        </Link>
        .
      </p>
    </div>
  );
}
