/**
 * Map skill names extracted from a resume onto the curated taxonomy (skills.name and
 * skills.aliases, migration 0006 / taxonomy v2). Only taxonomy skills can be added to a profile;
 * anything that does not match is returned separately so the review screen can say so.
 *
 * Normalised comparison: case, spaces, dots and hyphens are ignored ("Node.js" = "nodejs" =
 * "Node JS"), but "+" and "#" are kept, so "C++" and "C#" never collapse into "C".
 *
 * Pure, so it is unit-tested directly.
 */
export type TaxonomySkill = { id: string; name: string; aliases?: string[] | null };

export const normaliseSkill = (s: string) => s.toLowerCase().replace(/[\s.\-_/]+/g, '');

export function mapSkills(
  names: string[],
  taxonomy: TaxonomySkill[],
): { matched: { id: string; name: string; from: string }[]; unmatched: string[] } {
  const index = new Map<string, TaxonomySkill>();
  for (const skill of taxonomy) {
    index.set(normaliseSkill(skill.name), skill);
    for (const alias of skill.aliases ?? []) {
      const key = normaliseSkill(alias);
      if (!index.has(key)) index.set(key, skill);
    }
  }

  const matched: { id: string; name: string; from: string }[] = [];
  const seen = new Set<string>();
  const unmatched: string[] = [];
  for (const raw of names) {
    const hit = index.get(normaliseSkill(raw));
    if (!hit) {
      unmatched.push(raw);
      continue;
    }
    if (seen.has(hit.id)) continue;
    seen.add(hit.id);
    matched.push({ id: hit.id, name: hit.name, from: raw });
  }
  return { matched, unmatched };
}
