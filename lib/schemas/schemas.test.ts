/**
 * Zod schema tests — Phase 1 §5.5 exit criterion: "All Zod schemas written and unit-tested
 * against valid and invalid fixtures, including both publish-gate paths."
 *
 * These test the rules that carry consequences — the publish gate, URL safety, cross-field
 * ordering, status transitions — rather than asserting that `z.string()` rejects a number.
 */

import { describe, expect, it } from 'vitest';

import { applyInput, statusChangeInput } from './application';
import { clientProfileInput } from './client';
import { signupInput } from './auth';
import { jobInput, publishJobInput } from './job';
import { reportInput, sendMessageInput, startConversationInput } from './messaging';
import { currency, httpsUrl, money, optionalHttpsUrl, paginationParams, slug } from './primitives';
import { jobSearchParams } from './search';
import {
  itemMediaInput,
  portfolioItemInput,
  profileSuggestions,
  talentProfileInput,
} from './talent';
import { imageUploadInput } from './upload';

// A real v4 UUID. The all-1s placeholder is NOT a valid UUID — its variant nibble is wrong,
// and z.uuid() is right to reject it even though Postgres stores it happily.
const UUID = '11111111-1111-4111-8111-111111111111';
const ok = (s: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) =>
  s.safeParse(v).success;

describe('URL safety', () => {
  it('accepts an https link and strips the trailing slash', () => {
    expect(httpsUrl.parse('https://example.dev/')).toBe('https://example.dev');
    expect(httpsUrl.parse('  https://example.dev/work/  ')).toBe('https://example.dev/work');
  });

  it.each([
    ['javascript:alert(1)', 'the classic XSS vector a URL field invites'],
    ['data:text/html;base64,PHNjcmlwdD4=', 'data URLs can carry markup'],
    ['http://example.dev', 'plaintext http'],
    ['vbscript:msgbox(1)', 'legacy script scheme'],
    ['file:///etc/passwd', 'local file scheme'],
    ['example.dev', 'no scheme at all'],
    ['', 'empty'],
  ])('rejects %s (%s)', (value) => {
    expect(ok(httpsUrl, value)).toBe(false);
  });

  it('rejects a link longer than the cap', () => {
    expect(ok(httpsUrl, `https://example.dev/${'a'.repeat(2100)}`)).toBe(false);
  });

  it('treats empty optional links as null rather than an error', () => {
    expect(optionalHttpsUrl.parse('')).toBeNull();
    expect(optionalHttpsUrl.parse(undefined)).toBeNull();
    expect(optionalHttpsUrl.parse('https://example.dev')).toBe('https://example.dev');
  });
});

describe('primitives', () => {
  it('normalises currency and rejects anything that is not ISO-4217 shaped', () => {
    expect(currency.parse('usd')).toBe('USD');
    expect(ok(currency, 'DOLLARS')).toBe(false);
    expect(ok(currency, 'US')).toBe(false);
  });

  it('accepts money as a bounded decimal string', () => {
    expect(ok(money, '1500')).toBe(true);
    expect(ok(money, '1500.50')).toBe(true);
    expect(ok(money, '1500.505')).toBe(false);
    expect(ok(money, '-5')).toBe(false);
    expect(ok(money, '1e10')).toBe(false);
  });

  it('enforces slug shape', () => {
    expect(ok(slug, 'maya-alder')).toBe(true);
    expect(ok(slug, 'Maya-Alder')).toBe(false);
    expect(ok(slug, 'maya--alder')).toBe(false);
    expect(ok(slug, 'ab')).toBe(false);
  });

  it('caps pagination and defaults to a sane page size', () => {
    expect(paginationParams.parse({}).limit).toBe(20);
    expect(paginationParams.parse({ limit: '50' }).limit).toBe(50);
    expect(ok(paginationParams, { limit: 500 })).toBe(false);
  });
});

// ─────────────────────── no publish gate (ADR-008) ───────────────────────
describe('publishing is unconditional', () => {
  // ADR-004 required a bio plus either an external site or two in-app projects. ADR-008
  // removed it: anyone may publish, and who is worth hiring is the client's judgement.
  // These tests exist so the gate cannot quietly come back as a validation rule.

  it('accepts a profile with no bio, no site and no projects', () => {
    expect(
      ok(talentProfileInput, {
        slug: 'nobody',
        headline: 'Developer',
        skills: [],
      }),
    ).toBe(true);
  });

  it('accepts a profile with no skills at all', () => {
    expect(
      ok(talentProfileInput, { slug: 'nobody', headline: 'Developer', bio: '', skills: [] }),
    ).toBe(true);
  });

  it("still requires a headline — it is the profile's name, not evidence", () => {
    // Without one, every browse card and inbox row renders blank. This is the one field the
    // product cannot display a profile without, which is a different thing from a gate.
    expect(ok(talentProfileInput, { slug: 'nobody', headline: '', skills: [] })).toBe(false);
  });
});

describe('profileSuggestions — advice, never refusal', () => {
  it('says nothing when a profile is already substantial', () => {
    expect(
      profileSuggestions({
        bio: 'x'.repeat(200),
        websiteUrl: 'https://example.dev',
        portfolioItemCount: 2,
        skillCount: 3,
      }),
    ).toEqual([]);
  });

  it('names what is thin without ever blocking', () => {
    const out = profileSuggestions({
      bio: '',
      websiteUrl: null,
      portfolioItemCount: 0,
      skillCount: 0,
    });
    expect(out).toHaveLength(3);
  });

  it('treats a site link and a project as interchangeable evidence', () => {
    const withSite = profileSuggestions({
      bio: 'x'.repeat(200),
      websiteUrl: 'https://example.dev',
      portfolioItemCount: 0,
      skillCount: 1,
    });
    const withItem = profileSuggestions({
      bio: 'x'.repeat(200),
      websiteUrl: null,
      portfolioItemCount: 1,
      skillCount: 1,
    });
    expect(withSite).toEqual([]);
    expect(withItem).toEqual([]);
  });

  it('flags one project as fine — the old two-item rule is gone', () => {
    const out = profileSuggestions({
      bio: 'x'.repeat(200),
      websiteUrl: null,
      portfolioItemCount: 1,
      skillCount: 1,
    });
    expect(out).toEqual([]);
  });
});

describe('talent profile', () => {
  const valid = {
    slug: 'maya-alder',
    headline: 'Payments and serverless developer',
    bio: 'x'.repeat(200),
    currency: 'USD',
    skills: [{ skillId: UUID }],
  };

  it('accepts a complete profile', () => {
    expect(ok(talentProfileInput, valid)).toBe(true);
  });

  it('ACCEPTS a thin bio — the 120-character minimum was part of the gate (ADR-008)', () => {
    // It used to be rejected as the §8 thin-profile mitigation. It now ranks badly instead of
    // being refused, which is the whole substance of the change.
    expect(ok(talentProfileInput, { ...valid, bio: 'Full-stack dev.' })).toBe(true);
  });

  it('accepts no skills, which only costs visibility in skill filters', () => {
    expect(ok(talentProfileInput, { ...valid, skills: [] })).toBe(true);
  });

  it('still caps skills at 30 — a list of everything says nothing', () => {
    const many = Array.from({ length: 31 }, () => ({ skillId: UUID }));
    expect(ok(talentProfileInput, { ...valid, skills: many })).toBe(false);
  });

  it('rejects an inverted rate range', () => {
    expect(ok(talentProfileInput, { ...valid, hourlyRateMin: '200', hourlyRateMax: '50' })).toBe(
      false,
    );
    expect(ok(talentProfileInput, { ...valid, hourlyRateMin: '50', hourlyRateMax: '200' })).toBe(
      true,
    );
  });

  it('rejects a non-https portfolio link', () => {
    expect(ok(talentProfileInput, { ...valid, websiteUrl: 'javascript:alert(1)' })).toBe(false);
  });
});

describe('portfolio item', () => {
  const valid = { title: 'Checkout rebuild', description: 'x'.repeat(60) };

  it('accepts a described project', () => {
    expect(ok(portfolioItemInput, valid)).toBe(true);
  });

  it('rejects dates in the wrong order', () => {
    expect(
      ok(portfolioItemInput, { ...valid, startedAt: '2026-06-01', endedAt: '2026-01-01' }),
    ).toBe(false);
    expect(
      ok(portfolioItemInput, { ...valid, startedAt: '2026-01-01', endedAt: '2026-06-01' }),
    ).toBe(true);
  });

  it('requires alt text on media — an accessibility gate, not a nicety', () => {
    expect(ok(itemMediaInput, { url: 'https://example.dev/a.png', altText: '' })).toBe(false);
    expect(
      ok(itemMediaInput, { url: 'https://example.dev/a.png', altText: 'Checkout screen' }),
    ).toBe(true);
  });
});

describe('job', () => {
  const valid = {
    title: 'Stripe and serverless payments integration',
    slug: 'stripe-serverless-payments',
    description: 'x'.repeat(200),
    engagementType: 'fixed',
    skills: [{ skillId: UUID, isRequired: true }],
  };

  it('accepts a complete job', () => {
    expect(ok(jobInput, valid)).toBe(true);
  });

  it('rejects an inverted budget', () => {
    expect(ok(jobInput, { ...valid, budgetMin: '5000', budgetMax: '1000' })).toBe(false);
  });

  it('requires at least one skill, and at least one REQUIRED skill', () => {
    expect(ok(jobInput, { ...valid, skills: [] })).toBe(false);
    expect(ok(jobInput, { ...valid, skills: [{ skillId: UUID, isRequired: false }] })).toBe(false);
  });

  it('requires a location for hybrid and onsite roles', () => {
    expect(ok(jobInput, { ...valid, locationType: 'onsite' })).toBe(false);
    expect(ok(jobInput, { ...valid, locationType: 'onsite', location: 'Zurich' })).toBe(true);
    expect(ok(jobInput, { ...valid, locationType: 'remote' })).toBe(true);
  });

  it('rejects a past deadline only on publish, not on draft save', () => {
    const past = new Date(Date.now() - 86_400_000);
    expect(ok(publishJobInput, { deadline: past })).toBe(false);
    expect(ok(publishJobInput, { deadline: new Date(Date.now() + 86_400_000) })).toBe(true);
    // A draft with a stale deadline must still be savable, or editing it is impossible.
    expect(ok(jobInput, { ...valid, deadline: past })).toBe(true);
  });
});

describe('application status transitions', () => {
  const base = { applicationId: UUID };

  it('lets a client move applied → shortlisted → hired', () => {
    expect(
      ok(statusChangeInput, { ...base, actor: 'client', from: 'applied', to: 'shortlisted' }),
    ).toBe(true);
    expect(
      ok(statusChangeInput, { ...base, actor: 'client', from: 'shortlisted', to: 'hired' }),
    ).toBe(true);
  });

  it('stops a client skipping straight to hired', () => {
    expect(ok(statusChangeInput, { ...base, actor: 'client', from: 'applied', to: 'hired' })).toBe(
      false,
    );
  });

  it('stops anyone reopening a rejected or hired application', () => {
    expect(
      ok(statusChangeInput, { ...base, actor: 'client', from: 'rejected', to: 'shortlisted' }),
    ).toBe(false);
    expect(ok(statusChangeInput, { ...base, actor: 'client', from: 'hired', to: 'rejected' })).toBe(
      false,
    );
  });

  it('lets talent withdraw but not promote themselves', () => {
    expect(
      ok(statusChangeInput, { ...base, actor: 'talent', from: 'applied', to: 'withdrawn' }),
    ).toBe(true);
    expect(ok(statusChangeInput, { ...base, actor: 'talent', from: 'applied', to: 'hired' })).toBe(
      false,
    );
    expect(
      ok(statusChangeInput, { ...base, actor: 'talent', from: 'applied', to: 'shortlisted' }),
    ).toBe(false);
  });

  it('rejects an empty cover note', () => {
    expect(ok(applyInput, { jobId: UUID, coverNote: 'Hi' })).toBe(false);
    expect(ok(applyInput, { jobId: UUID, coverNote: 'x'.repeat(60) })).toBe(true);
  });
});

describe('messaging (ADR-007 D1)', () => {
  it('accepts a message and enforces the length cap that matches the CHECK', () => {
    expect(ok(sendMessageInput, { conversationId: UUID, body: 'Hello' })).toBe(true);
    expect(ok(sendMessageInput, { conversationId: UUID, body: '' })).toBe(false);
    expect(ok(sendMessageInput, { conversationId: UUID, body: 'x'.repeat(5001) })).toBe(false);
  });

  it('allows a conversation with or without a job anchor', () => {
    expect(ok(startConversationInput, { talentId: UUID, body: 'Hi' })).toBe(true);
    expect(ok(startConversationInput, { talentId: UUID, jobId: UUID, body: 'Hi' })).toBe(true);
  });

  it('requires a substantive reason on a report', () => {
    expect(ok(reportInput, { subjectType: 'message', subjectId: UUID, reason: 'bad' })).toBe(false);
    expect(
      ok(reportInput, {
        subjectType: 'message',
        subjectId: UUID,
        reason: 'Unsolicited advertising.',
      }),
    ).toBe(true);
  });
});

describe('auth and search', () => {
  it('requires a 12-character password', () => {
    expect(ok(signupInput, { email: 'a@b.co', password: 'short', displayName: 'Maya' })).toBe(
      false,
    );
    expect(
      ok(signupInput, { email: 'a@b.co', password: 'correct horse battery', displayName: 'Maya' }),
    ).toBe(true);
  });

  it('parses comma-separated filters from a query string', () => {
    const parsed = jobSearchParams.parse({ skills: 'nextjs,stripe , webhooks', limit: '10' });
    expect(parsed.skills).toEqual(['nextjs', 'stripe', 'webhooks']);
    expect(parsed.limit).toBe(10);
    expect(parsed.sort).toBe('recent');
  });

  it('accepts an empty filter set', () => {
    expect(jobSearchParams.parse({}).skills).toEqual([]);
  });
});

describe('uploads', () => {
  const valid = {
    fileName: 'shot.png',
    contentType: 'image/png',
    sizeBytes: 1024,
    altText: 'A screenshot',
  };

  it('accepts an allowed image', () => {
    expect(ok(imageUploadInput, valid)).toBe(true);
  });

  it('rejects types not on the allow-list, including SVG', () => {
    // SVG is excluded deliberately: it can carry script, and it would be served from our
    // own origin.
    expect(ok(imageUploadInput, { ...valid, contentType: 'image/svg+xml' })).toBe(false);
    expect(ok(imageUploadInput, { ...valid, contentType: 'application/pdf' })).toBe(false);
  });

  it('rejects oversized files', () => {
    expect(ok(imageUploadInput, { ...valid, sizeBytes: 6 * 1024 * 1024 })).toBe(false);
  });
});

describe('client profile', () => {
  it('accepts a minimal company and rejects a non-https website', () => {
    expect(ok(clientProfileInput, { companyName: 'Northwind' })).toBe(true);
    expect(ok(clientProfileInput, { companyName: 'N', website: 'http://x.dev' })).toBe(false);
  });
});
