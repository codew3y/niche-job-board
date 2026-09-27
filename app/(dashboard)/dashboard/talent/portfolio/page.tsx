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
    .select(
      `id, title, description, role, outcome, tech_stack, repo_url, live_url, sort_order,
       item_media ( id, url, alt_text, sort_order )`,
    )
    .eq('talent_id', profile.id)
    .order('sort_order');

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Portfolio"
        subtitle={
          <>
            The projects clients read first.{' '}
            {profile.is_published && (
              <Link href={`/talent/${profile.slug}`} className="prose-link font-medium">
                See your public profile
              </Link>
            )}
          </>
        }
      />

      {/*
        There used to be a warning here that deleting below two projects would unpublish the
        profile. That was true of the publish gate and is false since ADR-008 — nothing
        unpublishes a profile but the author. A warning about a consequence that no longer
        happens is worse than no warning.
      */}

      <PortfolioManager items={items ?? []} />
    </div>
  );
}
