/**
 * Onboarding progress derivation.
 *
 * Progress is computed from saved data rather than a stored step index, so these tests are
 * what prove "refresh doesn't lose work" (§6) actually holds. A stored index would satisfy
 * the wording and none of the intent — it can point at step 3 while step 2 was never written.
 */

import { describe, expect, it } from 'vitest';

import {
  CLIENT_STEPS,
  TALENT_STEPS,
  clientStepDone,
  makeSlug,
  nextClientStep,
  nextTalentStep,
  talentStepDone,
  type TalentProgress,
} from './steps';

const p = (over: Partial<TalentProgress> = {}): TalentProgress => ({
  hasBasics: false,
  hasSkills: false,
  hasEvidence: false,
  isPublished: false,
  ...over,
});

describe('talent onboarding progress', () => {
  it('starts at the first step', () => {
    expect(nextTalentStep(p())).toBe('basics');
  });

  it('advances only as each step is actually saved', () => {
    expect(nextTalentStep(p({ hasBasics: true }))).toBe('skills');
    expect(nextTalentStep(p({ hasBasics: true, hasSkills: true }))).toBe('portfolio');
    expect(nextTalentStep(p({ hasBasics: true, hasSkills: true, hasEvidence: true }))).toBe('review');
  });

  it('does not skip a gap — evidence saved but basics missing still resumes at basics', () => {
    // Reachable in practice: someone adds links, then clears their bio.
    expect(nextTalentStep(p({ hasEvidence: true, hasSkills: true }))).toBe('basics');
  });

  it('marks review complete only once published', () => {
    const ready = p({ hasBasics: true, hasSkills: true, hasEvidence: true });
    expect(talentStepDone('review', ready)).toBe(false);
    expect(talentStepDone('review', { ...ready, isPublished: true })).toBe(true);
  });

  it('reports each step independently', () => {
    const state = p({ hasBasics: true, hasEvidence: true });
    expect(talentStepDone('basics', state)).toBe(true);
    expect(talentStepDone('skills', state)).toBe(false);
    expect(talentStepDone('portfolio', state)).toBe(true);
  });
});

describe('client onboarding progress', () => {
  it('walks company → job → review', () => {
    expect(nextClientStep({ hasCompany: false, hasJobDraft: false, hasPublishedJob: false })).toBe('company');
    expect(nextClientStep({ hasCompany: true, hasJobDraft: false, hasPublishedJob: false })).toBe('job');
    expect(nextClientStep({ hasCompany: true, hasJobDraft: true, hasPublishedJob: false })).toBe('review');
  });

  it('marks review complete only once a job is actually published', () => {
    const state = { hasCompany: true, hasJobDraft: true, hasPublishedJob: false };
    expect(clientStepDone('review', state)).toBe(false);
    expect(clientStepDone('review', { ...state, hasPublishedJob: true })).toBe(true);
  });
});

describe('step definitions', () => {
  it('has unique slugs', () => {
    for (const steps of [TALENT_STEPS, CLIENT_STEPS]) {
      const slugs = steps.map((s) => s.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it('ends both wizards on review, which is where publishing happens', () => {
    expect(TALENT_STEPS.at(-1)?.slug).toBe('review');
    expect(CLIENT_STEPS.at(-1)?.slug).toBe('review');
  });
});

describe('slug generation', () => {
  it('produces a URL-safe slug', () => {
    expect(makeSlug('Maya Alder')).toMatch(/^maya-alder-[a-z0-9]{5}$/);
  });

  it('strips accents and punctuation rather than dropping the name', () => {
    expect(makeSlug('Zoë O’Brien-Smith')).toMatch(/^zoe-o-brien-smith-[a-z0-9]{5}$/);
  });

  it('never returns an empty slug', () => {
    expect(makeSlug('！！！')).toMatch(/^member-[a-z0-9]{5}$/);
    expect(makeSlug('')).toMatch(/^member-[a-z0-9]{5}$/);
  });

  it('gives two people with the same name different slugs', () => {
    // Without the suffix, the second Alex Chen hits a unique violation — and retrying until
    // it succeeds would leak how many people share a name.
    const slugs = new Set(Array.from({ length: 50 }, () => makeSlug('Alex Chen')));
    expect(slugs.size).toBeGreaterThan(45);
  });

  it('caps the length so a long name cannot blow past the column limit', () => {
    expect(makeSlug('a'.repeat(200)).length).toBeLessThanOrEqual(46);
  });
});
