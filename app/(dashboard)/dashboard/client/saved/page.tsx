import { BookmarkSimple as Bookmark } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
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
    <div className="max-w-3xl">
      <PageHeader title="Saved developers" subtitle="Private to you. They are never told." />

      {rows.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nothing saved yet"
          body="Save a developer while you browse and they land here."
          action={
            <Link href="/browse?type=developers" className={buttonStyles({ size: 'sm' })}>
              Browse developers
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-border-base overflow-hidden rounded-lg border border-border-base bg-surface-raised">
          {rows.map(({ talent_profiles: p }) => {
            const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-4 sm:flex-nowrap sm:px-5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3.5">
                  <Avatar name={p.headline} className="hidden sm:grid" />
                  <div className="min-w-0">
                    <h2 className="font-semibold break-words">
                      <Link href={`/talent/${p.slug}`} className="hover:underline">
                        {p.headline}
                      </Link>
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-subtle tabular-nums">
                      <span>
                        {p.portfolio_item_count} project{p.portfolio_item_count === 1 ? '' : 's'}
                        {rate ? <> · {rate}</> : null}
                      </span>
                      {/* A profile can be unpublished after being saved: say so rather than
                          linking to a 404 without warning. */}
                      {!p.is_published && <Badge tone="outline">No longer public</Badge>}
                    </p>
                  </div>
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
