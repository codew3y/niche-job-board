import 'server-only';

import { createClient } from '../supabase/server';

export type SkillOption = { slug: string; name: string; category: string };

/**
 * The taxonomy, for filter controls.
 *
 * Read from the database rather than imported from lib/seeds/skills.seed.ts. The seed is the
 * source for what gets inserted; the table is the source for what exists. Importing the seed
 * into a page would show a filter option for a skill nobody has run the seed for yet, and the
 * filter would return nothing with no explanation.
 */
export async function listSkills(): Promise<SkillOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('skills')
    .select('slug, name, category')
    .order('category')
    .order('name');
  return data ?? [];
}

/** Grouped for an <optgroup>, because a flat list of 126 is not a control anyone can use. */
export function groupByCategory(skills: SkillOption[]): [string, SkillOption[]][] {
  const groups = new Map<string, SkillOption[]>();
  for (const s of skills) {
    const list = groups.get(s.category);
    if (list) list.push(s);
    else groups.set(s.category, [s]);
  }
  return [...groups.entries()];
}
