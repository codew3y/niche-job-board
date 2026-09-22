import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SaveButton } from '@/components/shared/save-button';
import { formatRange } from '@/components/shared/money';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Saved developers' };

export default async function SavedTalentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: saved } = client
    ? await supabase
        .from('saved_talent')
        .select(
          `talent_id, created_at,
           talent_profiles ( id, slug, headline, hourly_rate_min, hourly_rate_max, currency,
                             portfolio_item_count, is_published )`,
        )
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
    : { data: null };

  const rows = (saved ?? []).filter((r) => r.talent_profiles) as unknown as {
    talent_profiles: {
      id: string;
      slug: string;
      headline: string;
      hourly_rate_min: string | null;
      hourly_rate_max: string | null;
      currency: string;
      portfolio_item_count: number;
      is_published: boolean;
    };
  }[];

  return (
    <div>
      <PageHeader title="Saved developers" subtitle="Private to you — they are never told." />

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          body="Bookmark a developer while browsing and they land here."
          action={
            <Link href="/talent" className="text-accent hover:underline">
              Browse developers
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border-base rounded-[--radius] border border-border-base">
          {rows.map(({ talent_profiles: p }) => {
            const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <h2 className="font-medium">
                    <Link href={`/talent/${p.slug}`} className="hover:text-accent">
                      {p.headline}
                    </Link>
                  </h2>
                  <p className="mt-0.5 text-sm text-text-subtle">
                    {p.portfolio_item_count} project{p.portfolio_item_count === 1 ? '' : 's'}
                    {rate ? ` · ${rate}` : ''}
                    {/* A profile can be unpublished after being saved — say so rather than
                        linking to a 404. */}
                    {!p.is_published ? ' · no longer public' : ''}
                  </p>
                </div>
                <SaveButton kind="talent" id={p.id} saved label={p.headline} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
