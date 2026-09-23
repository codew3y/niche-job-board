/**
 * Text builder tests.
 *
 * These assert the PROPERTIES that make matching work, not exact strings — an exact-output
 * test would break on every wording change and prove nothing about relevance. The properties
 * come from docs/eval-set.md: each one, if violated, makes a specific eval case fail.
 */

import { describe, expect, it } from 'vitest';

import { isEmbeddable, itemToText, jobToText, talentToText, truncate } from './text';

const maya = {
  headline: 'Payments-focused full-stack developer',
  bio: 'Three production Stripe integrations on Next.js/Vercel, all with signed webhook handling and idempotent replay.',
  skills: [
    { name: 'TypeScript', proficiency: 'expert', years: 8 },
    { name: 'Payment integration', proficiency: 'expert', years: 5 },
  ],
  items: [
    {
      title: 'SaaS checkout rebuild',
      description: 'Replaced a homegrown subscription engine with Stripe Billing.',
      role: 'Sole developer',
      outcome: 'Failed payments fell from 4.1% to 0.6%',
      techStack: ['Stripe', 'Next.js', 'Postgres'],
    },
  ],
  availability: 'part_time',
  yearsExperience: 8,
  timezone: 'Europe/Zurich',
};

/** The G3 distractor: right tags, nothing shipped. */
const distractor = {
  headline: 'Next.js developer',
  bio: 'I build web apps with Next.js. Interested in payments and Stripe.',
  skills: [
    { name: 'Next.js', proficiency: 'expert', years: 4 },
    { name: 'Payment integration', proficiency: 'familiar', years: null },
  ],
  items: [],
  availability: 'full_time',
  yearsExperience: 4,
  timezone: null,
};

describe('talentToText', () => {
  it('PUTS SHIPPED WORK BEFORE SKILL TAGS', () => {
    // Rule 2, and the whole product proposition. If tags dominate, the distractor above
    // outranks Maya on a payments brief and the eval's precision@1 goes to zero while
    // nDCG still looks respectable (docs/eval-set.md §4).
    const text = talentToText(maya);
    expect(text.indexOf('Shipped work')).toBeLessThan(text.indexOf('Skills:'));
  });

  it('includes the outcome, which is what separates "used" from "delivered"', () => {
    expect(talentToText(maya)).toContain('Failed payments fell from 4.1% to 0.6%');
  });

  it('qualifies skills with proficiency and years', () => {
    expect(talentToText(maya)).toContain('TypeScript (expert, 8 years)');
  });

  it('PRODUCES VISIBLY LESS TEXT FOR A PROFILE WITH NOTHING SHIPPED', () => {
    // The distractor must not be able to look as substantial as Maya. If the builder padded
    // sparse profiles, this difference would vanish and so would the ranking signal.
    expect(talentToText(distractor).length).toBeLessThan(talentToText(maya).length * 0.6);
  });

  it('omits a section entirely rather than emitting an empty label', () => {
    const text = talentToText(distractor);
    expect(text).not.toContain('Shipped work');
    expect(text).not.toMatch(/\w+:\s*$/m);
  });

  it('survives a profile with nothing but a headline', () => {
    const text = talentToText({ headline: 'Developer', bio: null, skills: [], items: [] });
    expect(text).toBe('Developer: Developer');
    // And says so, rather than being embedded as if it meant something.
    expect(isEmbeddable(text)).toBe(false);
  });

  it('NEVER INCLUDES A URL — a link is not text the model can read', () => {
    const text = talentToText({
      ...maya,
      items: [{ ...maya.items[0]!, description: 'See https://example.com/case-study for detail.' }],
    });
    // A URL inside user prose is unavoidable; what matters is that the builder never ADDS one
    // from website_url/github_url, which is where padding would come from.
    expect(text).not.toContain('websiteUrl');
    expect(text.match(/https?:\/\//g)?.length ?? 0).toBeLessThanOrEqual(1);
  });
});

describe('jobToText', () => {
  const job = {
    title: 'Stripe subscription migration',
    description: 'Move billing off a homegrown system onto Stripe subscriptions.',
    requirements: 'Experience migrating a live billing system.',
    skills: [
      { name: 'Payment integration', isRequired: true },
      { name: 'Next.js', isRequired: false },
    ],
    engagementType: 'fixed',
    locationType: 'remote',
    experienceLevel: 'senior',
  };

  it('SEPARATES REQUIRED FROM NICE-TO-HAVE', () => {
    // Merging them says the brief wants both equally, which is a different brief.
    const text = jobToText(job);
    expect(text).toContain('Must have: Payment integration');
    expect(text).toContain('Nice to have: Next.js');
  });

  it('keeps the title first, since it is the strongest statement of the work', () => {
    expect(jobToText(job).startsWith('Role: Stripe subscription migration')).toBe(true);
  });

  it('drops empty optional sections', () => {
    const text = jobToText({ ...job, requirements: null, responsibilities: null });
    expect(text).not.toContain('Requirements:');
    expect(text).not.toContain('Responsibilities:');
  });
});

describe('itemToText', () => {
  it('labels outcome separately from description', () => {
    const text = itemToText(maya.items[0]!);
    expect(text).toContain('What it involved:');
    expect(text).toContain('Outcome: Failed payments fell');
  });
});

describe('truncate', () => {
  it('NEVER CUTS MID-WORD', () => {
    // "Stripe subscription billing" severed into "Stripe subscr" embeds as something else.
    const text = 'Stripe subscription billing migration '.repeat(500);
    const out = truncate(text, 100);
    expect(out.endsWith('subscr')).toBe(false);
    expect(out.length).toBeLessThanOrEqual(100);
    expect(out).toMatch(/[a-z]$/);
  });

  it('prefers a paragraph boundary when one is available', () => {
    const text = `${'a'.repeat(70)}\n\n${'b'.repeat(200)}`;
    expect(truncate(text, 100)).toBe('a'.repeat(70));
  });

  it('leaves short text alone', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('still truncates when there is no usable boundary near the limit', () => {
    const out = truncate('x'.repeat(500), 100);
    expect(out.length).toBe(100);
  });
});

describe('isEmbeddable', () => {
  it('rejects a headline-only profile', () => {
    expect(isEmbeddable('Developer: Full-stack developer')).toBe(false);
  });

  it('accepts a profile with real substance', () => {
    expect(isEmbeddable(talentToText(maya))).toBe(true);
  });

  it('is not a publish gate — it only decides whether to spend an embedding call', () => {
    // ADR-008 removed every gate on publishing. A profile that fails this still goes live;
    // it just ranks on nothing until its author adds something to rank on.
    expect(isEmbeddable('Developer: Dev')).toBe(false);
  });
});
