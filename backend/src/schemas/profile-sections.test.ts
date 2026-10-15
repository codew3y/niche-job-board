import { describe, expect, it } from 'vitest';

import { browseType } from './search';
import { educationInput, experienceInput, portfolioItemInput } from './talent';

const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  s.safeParse(v).success;

describe('project links (migration 0020)', () => {
  const base = { title: 'Checkout rebuild', description: 'x'.repeat(60) };

  it('accepts none, one, or several https links', () => {
    expect(ok(portfolioItemInput, base)).toBe(true);
    expect(ok(portfolioItemInput, { ...base, links: ['https://github.com/a/b'] })).toBe(true);
    expect(
      ok(portfolioItemInput, { ...base, links: ['https://github.com/a/b', 'https://b.dev'] }),
    ).toBe(true);
  });

  it('refuses any link that is not https — the same rule as every other URL field', () => {
    expect(ok(portfolioItemInput, { ...base, links: ['http://b.dev'] })).toBe(false);
    expect(ok(portfolioItemInput, { ...base, links: ['javascript:alert(1)'] })).toBe(false);
  });

  it('caps a project at ten links, matching the database CHECK', () => {
    const links = Array.from({ length: 11 }, (_, i) => `https://b.dev/${i}`);
    expect(ok(portfolioItemInput, { ...base, links })).toBe(false);
    expect(ok(portfolioItemInput, { ...base, links: links.slice(0, 10) })).toBe(true);
  });
});

describe('experience', () => {
  const role = { role: 'Backend developer', company: 'Acme', startDate: '2022-03' };

  it('turns a month input into the first of that month', () => {
    const parsed = experienceInput.parse(role);
    expect(parsed.startDate).toBe('2022-03-01');
    expect(parsed.endDate).toBeNull();
  });

  it('treats a blank end as "still there"', () => {
    expect(experienceInput.parse({ ...role, endDate: '' }).endDate).toBeNull();
  });

  it('refuses an end before the start', () => {
    expect(ok(experienceInput, { ...role, endDate: '2021-12' })).toBe(false);
    expect(ok(experienceInput, { ...role, endDate: '2023-01' })).toBe(true);
  });

  it('needs a role, a company and a start', () => {
    expect(ok(experienceInput, { ...role, role: '' })).toBe(false);
    expect(ok(experienceInput, { ...role, company: '' })).toBe(false);
    expect(ok(experienceInput, { ...role, startDate: '' })).toBe(false);
  });
});

describe('education', () => {
  it('needs only a school; degree and years are optional', () => {
    const parsed = educationInput.parse({ school: 'ETH Zürich', startYear: '', endYear: '' });
    expect(parsed.degree).toBe('');
    expect(parsed.startYear).toBeNull();
    expect(parsed.endYear).toBeNull();
  });

  it('keeps years in the range the database allows, and in order', () => {
    expect(ok(educationInput, { school: 'MIT', startYear: '1900' })).toBe(false);
    expect(ok(educationInput, { school: 'MIT', startYear: '2018', endYear: '2016' })).toBe(false);
    expect(ok(educationInput, { school: 'MIT', startYear: '2014', endYear: '2018' })).toBe(true);
  });
});

describe('browse type', () => {
  it('falls back to "all" for anything unrecognised — it is a query string', () => {
    expect(browseType.parse('jobs')).toBe('jobs');
    expect(browseType.parse('developers')).toBe('developers');
    expect(browseType.parse(undefined)).toBe('all');
    expect(browseType.parse('<script>')).toBe('all');
  });
});
