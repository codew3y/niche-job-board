import { createClient } from '../supabase/server';

/**
 * Which of the rows on this page the viewer has already saved.
 *
 * One query per list, not one per card. The alternative — a `saved` boolean on each card
 * fetched separately — is 20 round trips to render a page of 20.
 *
 * Returns an empty set for a signed-out visitor, for a viewer with no profile of the relevant
 * role, and on error. An empty set renders every button as "Save", which is the safe wrong
 * answer: pressing it is idempotent (the action toggles), so the worst case is a second click.
 */
export async function savedJobIds(jobIds: string[]): Promise<Set<string>> {
  if (jobIds.length === 0) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase.from('saved_jobs').select('job_id').in('job_id', jobIds);
  return new Set((data ?? []).map((r) => r.job_id));
}

export async function savedTalentIds(talentIds: string[]): Promise<Set<string>> {
  if (talentIds.length === 0) return new Set();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('saved_talent')
    .select('talent_id')
    .in('talent_id', talentIds);
  return new Set((data ?? []).map((r) => r.talent_id));
}

/**
 * Whether the viewer holds the role that can save this kind of thing. The button is hidden
 * otherwise — a control that always fails is worse than no control.
 */
export async function canSave(kind: 'job' | 'talent'): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // A talent saves jobs; a client saves developers.
  const table = kind === 'job' ? 'talent_profiles' : 'client_profiles';
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  return (count ?? 0) > 0;
}
