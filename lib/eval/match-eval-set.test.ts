// Consistency checks on the hand-labelled evaluation set.
//
// The point of these is that the eval set is the thing Phase 4 is measured against. If it
// drifts from the taxonomy, or if a gate is set somewhere a perfect ranker cannot reach, the
// measurement is worthless and — worse — looks fine.

import { describe, expect, it } from 'vitest';
import { skillsSeed } from '../seeds/skills.seed';
import {
  type Grade,
  calibrationJobs,
  evalGates,
  evalGrades,
  evalJobs,
  evalProfiles,
  gradesForJob,
  gradesForProfile,
  ndcgAt,
  precisionAt1,
  thinProfiles,
} from './match-eval-set';

const slugs = new Set(skillsSeed.map((s) => s.slug));
const jobIds = evalJobs.map((j) => j.id);
const profileIds = evalProfiles.map((p) => p.id);

describe('eval set ↔ taxonomy', () => {
  it('only uses skill slugs that exist in the seed', () => {
    const unknown: string[] = [];
    for (const j of evalJobs)
      for (const s of j.skills) if (!slugs.has(s)) unknown.push(`${j.id}: ${s}`);
    for (const p of evalProfiles)
      for (const s of p.skills) if (!slugs.has(s)) unknown.push(`${p.id}: ${s}`);
    expect(unknown).toEqual([]);
  });
});

describe('eval set shape', () => {
  it('grades every job against every profile', () => {
    const missing: string[] = [];
    for (const j of jobIds) {
      for (const p of profileIds) {
        if (evalGrades[j]?.[p] === undefined) missing.push(`${j}\u00d7${p}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('has no grade outside 0–2', () => {
    const bad = Object.entries(evalGrades).flatMap(([j, row]) =>
      Object.entries(row)
        .filter(([, g]) => ![0, 1, 2].includes(g))
        .map(([p, g]) => `${j}×${p}=${g}`),
    );
    expect(bad).toEqual([]);
  });

  it('gives every ranking job exactly one grade-2 profile', () => {
    const rankingJobs = jobIds.filter((j) => !calibrationJobs.includes(j as never));
    const bad = rankingJobs
      .map((j) => [j, Object.values(gradesForJob(j)).filter((g) => g === 2).length] as const)
      .filter(([, n]) => n !== 1)
      .map(([j, n]) => `${j} has ${n} grade-2 profiles`);
    expect(bad).toEqual([]);
  });

  it('gives calibration jobs no grade-2 profile — that is what makes them calibration cases', () => {
    for (const j of calibrationJobs) {
      expect(Object.values(gradesForJob(j)).filter((g) => g === 2)).toHaveLength(0);
    }
  });

  it('caps thin profiles at grade 1 everywhere', () => {
    // PROJECT.md §8: a profile whose only evidence is a URL must not score as a strong match
    // until it carries first-party text. If this ever needs relaxing, that is a product
    // decision, not a test fix.
    for (const p of thinProfiles) {
      for (const j of jobIds) expect(gradesForJob(j)[p]).toBeLessThanOrEqual(1);
    }
    for (const p of thinProfiles) {
      expect(evalProfiles.find((x) => x.id === p)?.items).toHaveLength(0);
    }
  });

  it('keeps every distractor below the profile it is meant to be confused with', () => {
    const bad: string[] = [];
    for (const p of evalProfiles) {
      if (!p.distractorFor) continue;
      const g = gradesForJob(p.distractorFor)[p.id];
      if (g !== 1) bad.push(`${p.id} is a distractor for ${p.distractorFor} but graded ${g}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('gates are reachable', () => {
  // The bug this replaces: PROJECT.md asked for precision@5 >= 0.8 on a 5-profile pool where
  // most jobs had a single relevant profile, capping a PERFECT ranker at 0.32.
  const idealRanking = (grades: Record<string, Grade>) =>
    Object.keys(grades).sort((a, b) => (grades[b] ?? 0) - (grades[a] ?? 0));

  it('a perfect ranker clears the client-direction nDCG gate', () => {
    const rankingJobs = jobIds.filter((j) => !calibrationJobs.includes(j as never));
    const scores = rankingJobs.map((j) => {
      const g = gradesForJob(j);
      return ndcgAt(idealRanking(g), g, 5);
    });
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(mean).toBe(1);
    expect(mean).toBeGreaterThanOrEqual(evalGates.clientNdcgAt5);
  });

  it('a perfect ranker clears the talent-direction nDCG gate', () => {
    const scores = profileIds.map((p) => {
      const perJob = gradesForProfile(p);
      return ndcgAt(idealRanking(perJob), perJob, 3);
    });
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    expect(mean).toBe(1);
    expect(mean).toBeGreaterThanOrEqual(evalGates.talentNdcgAt3);
  });

  it('a perfect ranker clears precision@1 on every ranking job', () => {
    const rankingJobs = jobIds.filter((j) => !calibrationJobs.includes(j as never));
    for (const j of rankingJobs) {
      const g = gradesForJob(j);
      expect(precisionAt1(idealRanking(g), g)).toBe(1);
    }
  });

  it('would have failed the old precision@5 gate, proving the gate was the problem', () => {
    // Retained as a regression guard on the reasoning, not on the code.
    const rankingJobs = jobIds.filter((j) => !calibrationJobs.includes(j as never));
    const maxP5 =
      rankingJobs
        .map((j) => Math.min(Object.values(gradesForJob(j)).filter((g) => g >= 1).length, 5) / 5)
        .reduce((a, b) => a + b, 0) / rankingJobs.length;
    expect(maxP5).toBeLessThan(0.8);
  });
});
