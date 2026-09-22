import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { PortfolioManager } from '@/components/portfolio/portfolio-manager';
import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Portfolio' };

export default async function PortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, slug, is_published, website_url, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) redirect('/onboarding/talent/basics');

  const { data: items } = await supabase
    .from('portfolio_items')
    .select('id, title, description, role, outcome, tech_stack, repo_url, live_url, sort_order')
    .eq('talent_id', profile.id)
    .order('sort_order');

  const onlyEvidence = !profile.website_url && (items?.length ?? 0) <= 2;

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Portfolio"
        subtitle={
          <>
            The projects clients read first.{' '}
            {profile.is_published && (
              <Link href={`/talent/${profile.slug}`} className="text-accent hover:underline">
                See your public profile
              </Link>
            )}
          </>
        }
      />

      {profile.is_published && onlyEvidence && (
        // Said before they hit the constraint, not after. Deleting below two items would
        // otherwise unpublish them without warning.
        <p className="mb-5 rounded-[--radius] border border-warning/40 bg-warning/5 p-3 text-sm text-pretty">
          These projects are the only evidence on your published profile. Deleting below two will
          unpublish it until you add a portfolio site link or another project.
        </p>
      )}

      <PortfolioManager items={items ?? []} />
    </div>
  );
}
