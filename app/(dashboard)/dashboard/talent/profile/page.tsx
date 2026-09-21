import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { PageHeader } from '@/components/ui/page-header';
import { createClient } from '@/lib/supabase/server';
import { publishBlockers } from '@/lib/schemas/talent';

export const metadata: Metadata = { title: 'Profile' };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: p } = await supabase
    .from('talent_profiles')
    .select('headline, bio, slug, is_published, website_url, portfolio_item_count')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!p) redirect('/onboarding/talent/basics');

  // The same function the publish action calls, so the page can never promise something
  // the server refuses (docs/components.md).
  const blockers = publishBlockers({
    bio: p.bio ?? '',
    websiteUrl: p.website_url,
    portfolioItemCount: p.portfolio_item_count,
  });

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Profile"
        subtitle={p.is_published ? 'Live and matchable.' : 'Draft — not visible to clients yet.'}
      />

      <div className="space-y-4 rounded-[--radius] border border-border-base bg-surface-raised p-5">
        <div>
          <p className="text-sm text-text-subtle">Headline</p>
          <p className="font-medium">{p.headline}</p>
        </div>
        <div>
          <p className="text-sm text-text-subtle">Bio</p>
          <p className="whitespace-pre-line text-sm text-text-muted">{p.bio || '—'}</p>
        </div>
        <div>
          <p className="text-sm text-text-subtle">Evidence</p>
          <p className="text-sm text-text-muted">
            {p.website_url ? `Portfolio site linked · ` : ''}
            {p.portfolio_item_count} project{p.portfolio_item_count === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      {blockers.length > 0 && (
        <div className="mt-4 rounded-[--radius] border border-border-base bg-surface-sunken p-4 text-sm">
          <p className="font-medium">Before you can publish</p>
          <ul className="mt-2 space-y-1 text-text-muted">
            {blockers.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-sm">
        <Link href="/onboarding/talent/basics" className="text-accent hover:underline">
          Edit your profile
        </Link>
      </p>
    </div>
  );
}
