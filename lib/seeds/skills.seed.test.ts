// Taxonomy invariants — Phase 0 deliverable per PROJECT.md §4.6.3.
//
// These are not style checks. Each one corresponds to a defect measured in the previous
// 105-row seed on 2026-09-20, which would otherwise have shipped into the Phase 1 database.
//
// Exact alias collisions (one alias owned by two rows — alias lookup is non-deterministic):
//   - `Playwright`  claimed by both `Web scraping` and `Automated testing`
//   - `workflows`   claimed by both `n8n` and `HubSpot`
//
// Token-subset near-collisions (alias is swallowed by another row's canonical name, so the
// more specific row can never win a lookup):
//   - `REST API` on `Express.js`  vs canonical `REST API integration`
//   - `queues`   on `Redis`        vs canonical `Queues & background jobs`
//   - `Flows`    on `Salesforce`   vs canonical `OAuth & identity flows`
//
// Name/slug divergence (the slug is the public URL and filter key, so it must not lie):
//   - `Payment integration` carried the slug `stripe`
//
// Semantic folding of competitors into one row:
//   - `Drizzle ORM` was an alias of `Prisma` — two competing ORMs collapsed into one row,
//     so every Drizzle developer would have been mis-resolved to Prisma.
//
// Run this in CI (Phase 2) and before every taxonomy review.

import { describe, expect, it } from 'vitest';
import { skillCategoryOrder, skillsSeed } from './skills.seed';

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

describe('skills taxonomy', () => {
  it('sits inside the 80–150 target band from PROJECT.md §4.6.4', () => {
    expect(skillsSeed.length).toBeGreaterThanOrEqual(80);
    expect(skillsSeed.length).toBeLessThanOrEqual(150);
  });

  it('has unique slugs', () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const s of skillsSeed) {
      if (seen.has(s.slug)) dupes.push(`${s.slug}: "${seen.get(s.slug)}" vs "${s.name}"`);
      seen.set(s.slug, s.name);
    }
    expect(dupes).toEqual([]);
  });

  it('has kebab-case slugs', () => {
    const bad = skillsSeed.filter((s) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s.slug));
    expect(bad.map((s) => `${s.name} -> ${s.slug}`)).toEqual([]);
  });

  it('has unique canonical names, case-insensitively', () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const s of skillsSeed) {
      const key = normalize(s.name);
      if (seen.has(key)) dupes.push(s.name);
      seen.add(key);
    }
    expect(dupes).toEqual([]);
  });

  it('never lets one alias belong to two skills', () => {
    const owner = new Map<string, string>();
    const collisions: string[] = [];
    for (const s of skillsSeed) {
      for (const alias of s.aliases) {
        const key = normalize(alias);
        if (owner.has(key)) collisions.push(`"${alias}" claimed by ${owner.get(key)} and ${s.name}`);
        owner.set(key, s.name);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('never lets an alias shadow a canonical skill name', () => {
    const names = new Set(skillsSeed.map((s) => normalize(s.name)));
    const shadows: string[] = [];
    for (const s of skillsSeed) {
      for (const alias of s.aliases) {
        if (names.has(normalize(alias))) shadows.push(`${s.name} aliases "${alias}"`);
      }
    }
    expect(shadows).toEqual([]);
  });

  it('never lets an alias be swallowed by another skill’s canonical name', () => {
    // A token-subset means the alias can never out-specify the row whose name contains it:
    // "queues" -> Redis would always shadow "Queues & background jobs".
    const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9.+#]+/g) ?? []);
    const isSubset = (a: Set<string>, b: Set<string>) => [...a].every((t) => b.has(t));
    const hits: string[] = [];
    for (const skill of skillsSeed) {
      for (const alias of skill.aliases) {
        const aliasTokens = tokens(alias);
        if (aliasTokens.size === 0) continue;
        for (const other of skillsSeed) {
          if (other.slug === skill.slug) continue;
          if (isSubset(aliasTokens, tokens(other.name))) {
            hits.push(`"${alias}" (on ${skill.name}) is swallowed by "${other.name}"`);
          }
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it('never repeats an alias inside one skill', () => {
    const bad: string[] = [];
    for (const s of skillsSeed) {
      const keys = s.aliases.map(normalize);
      if (new Set(keys).size !== keys.length) bad.push(s.name);
    }
    expect(bad).toEqual([]);
  });

  it('meets the two-source bar on every row', () => {
    // >= 2 distinct sources, or exactly 1 plus NICHE (deliberate corner coverage, §4.6.1).
    const failures = skillsSeed
      .filter((s) => {
        const unique = new Set(s.sources);
        if (unique.size >= 2) return false;
        return !(unique.size === 1 && unique.has('NICHE'));
      })
      .map((s) => `${s.name}: [${s.sources.join(', ')}]`);
    expect(failures).toEqual([]);
  });

  it('never rests a row on STACK alone — this project is not market evidence', () => {
    const failures = skillsSeed
      .filter((s) => s.sources.includes('STACK') && s.sources.length < 2)
      .map((s) => s.name);
    expect(failures).toEqual([]);
  });

  it('carries evidence prose for every row', () => {
    const empty = skillsSeed.filter((s) => s.evidence.trim().length < 20).map((s) => s.name);
    expect(empty).toEqual([]);
  });

  it('uses only declared categories, and declares only used categories', () => {
    const used = new Set(skillsSeed.map((s) => s.category));
    const declared = new Set(skillCategoryOrder);
    expect([...used].filter((c) => !declared.has(c))).toEqual([]);
    expect([...declared].filter((c) => !used.has(c))).toEqual([]);
  });

  it('keeps every category large enough to be worth showing as a picker group', () => {
    const counts = new Map<string, number>();
    for (const s of skillsSeed) counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    const thin = [...counts.entries()].filter(([, n]) => n < 4).map(([c, n]) => `${c}: ${n}`);
    expect(thin).toEqual([]);
  });
});
