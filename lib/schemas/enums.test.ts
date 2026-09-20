/**
 * Drift guard: the Zod enums must match the Postgres enums value-for-value.
 *
 * They are declared twice on purpose — reading either file should tell you the whole
 * vocabulary — so something has to prove the copies agree. If they drift, the form offers a
 * value the database rejects, or the database holds a value the form cannot display, and
 * neither failure appears until a user hits it.
 *
 * Order matters too: a reordered Postgres enum is a different type.
 */

import { describe, expect, it } from 'vitest';

import * as pg from '../db/schema/enums';
import * as zod from './enums';

const pairs: [string, { enumValues: readonly string[] }, { options: readonly string[] }][] = [
  ['active_role', pg.activeRole, zod.activeRole],
  ['availability', pg.availability, zod.availability],
  ['engagement_type', pg.engagementType, zod.engagementType],
  ['location_type', pg.locationType, zod.locationType],
  ['experience_level', pg.experienceLevel, zod.experienceLevel],
  ['job_status', pg.jobStatus, zod.jobStatus],
  ['application_status', pg.applicationStatus, zod.applicationStatus],
  ['proficiency', pg.proficiency, zod.proficiency],
  ['skill_category', pg.skillCategory, zod.skillCategory],
  ['report_subject', pg.reportSubject, zod.reportSubject],
  ['notification_type', pg.notificationType, zod.notificationType],
];

describe('Zod enums mirror the Postgres enums', () => {
  it.each(pairs)('%s', (_name, pgEnum, zodEnum) => {
    expect([...zodEnum.options]).toEqual([...pgEnum.enumValues]);
  });

  it('covers every Postgres enum — a new one must not be forgotten here', () => {
    // drizzle's pgEnum returns a FUNCTION carrying enumName/enumValues, not a plain object —
    // filtering on `typeof v === 'object'` silently matched nothing and the test passed
    // vacuously.
    const declared = (Object.values(pg) as unknown[])
      .filter(
        (v): v is { enumName: string } =>
          v !== null && (typeof v === 'object' || typeof v === 'function') && 'enumName' in v,
      )
      .map((v) => v.enumName)
      .sort();
    expect(declared).toEqual(pairs.map(([n]) => n).sort());
  });
});

describe('skill categories match the seeded taxonomy', () => {
  it('has the same 10 categories as lib/seeds/skills.seed.ts', async () => {
    const { skillCategoryOrder } = await import('../seeds/skills.seed');
    expect([...zod.skillCategory.options]).toEqual([...skillCategoryOrder]);
  });
});

describe('application status transitions', () => {
  it('defines a rule for every status, for both actors', () => {
    for (const actor of ['client', 'talent'] as const) {
      const table = zod.allowedStatusTransitions[actor];
      expect(Object.keys(table).sort()).toEqual([...zod.applicationStatus.options].sort());
    }
  });

  it('never allows a transition to a status that does not exist', () => {
    const valid = new Set<string>(zod.applicationStatus.options);
    for (const actor of ['client', 'talent'] as const) {
      for (const targets of Object.values(zod.allowedStatusTransitions[actor])) {
        for (const t of targets as readonly string[]) expect(valid.has(t)).toBe(true);
      }
    }
  });

  it('makes rejected, hired and withdrawn terminal for both sides', () => {
    for (const actor of ['client', 'talent'] as const) {
      for (const terminal of ['rejected', 'hired', 'withdrawn'] as const) {
        expect(zod.allowedStatusTransitions[actor][terminal]).toEqual([]);
      }
    }
  });
});
