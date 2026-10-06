import 'server-only';

import { createClient } from '../supabase/server';

/**
 * The live numbers under the home headline: open briefs, listed developers, and briefs published
 * in the last seven days. Counted from the database on each request, through the visitor's own
 * client, so RLS decides what counts (open jobs and published profiles only) exactly as it
 * decides what Browse shows. Never padded: a zero is reported as zero and the strip hides it.
 */
export async function boardStats(): Promise<{
  openBriefs: number;
  developers: number;
  newThisWeek: number;
}> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [open, developers, recent] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase
      .from('talent_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .gte('published_at', weekAgo),
  ]);

  return {
    openBriefs: open.count ?? 0,
    developers: developers.count ?? 0,
    newThisWeek: recent.count ?? 0,
  };
}
