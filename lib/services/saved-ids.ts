import { createClient } from '../supabase/server';
import {
  getClientProfileId,
  getSessionUser,
  getTalentProfileId,
  getViewer,
} from '../supabase/session';

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
  // Deduped per request — this page also calls canSave(), which asked the same question.
  if (!(await getSessionUser())) return new Set();

  const supabase = await createClient();
  const { data } = await supabase.from('saved_jobs').select('job_id').in('job_id', jobIds);
  return new Set((data ?? []).map((r) => r.job_id));
}

export async function savedTalentIds(talentIds: string[]): Promise<Set<string>> {
  if (talentIds.length === 0) return new Set();
  if (!(await getSessionUser())) return new Set();

  const supabase = await createClient();
  const { data } = await supabase
    .from('saved_talent')
    .select('talent_id')
    .in('talent_id', talentIds);
  return new Set((data ?? []).map((r) => r.talent_id));
}

/**
 * Whether the viewer, IN THEIR ACTIVE ROLE, can save this kind of thing. The button is hidden
 * otherwise — a control that always fails is worse than no control.
 *
 * Keyed on `active_role`, not on which profiles exist. It used to ask "has a talent profile?",
 * so a dual-role account browsing as a client got the developer's Save-a-job buttons — the
 * Browse page rendering one role while the dashboard rendered the other.
 */
export async function canSave(kind: 'job' | 'talent'): Promise<boolean> {
  const viewer = await getViewer();
  if (!viewer) return false;
  // A developer saves jobs; a client saves developers.
  if (kind === 'job')
    return viewer.activeRole === 'talent' && (await getTalentProfileId()) !== null;
  return viewer.activeRole === 'client' && (await getClientProfileId()) !== null;
}
