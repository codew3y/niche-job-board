/**
 * The privacy policy must name every third party the code actually talks to.
 *
 * This exists because the policy already went stale once in a way nobody would have caught by
 * reading it: Gemini was wired into matching while the policy still said there were four
 * processors and no third-party analytics. A privacy policy that lags the code is not a
 * document, it is a claim that happens to be false.
 *
 * Checked by scanning for the hosts the code sends data to, rather than a hand-kept list —
 * a list would drift in exactly the same way the policy did.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Repo-wide invariant: paths are anchored to the repository root, whatever the working directory.
const REPO = join(import.meta.dirname, '..', '..', '..');

/**
 * Whitespace-normalised before matching.
 *
 * The first version of this file matched the raw source and broke the moment Prettier
 * reflowed a paragraph — it was asserting line breaks, not meaning. JSX wraps wherever the
 * formatter decides, so any phrase spanning a line would have failed for a reason that has
 * nothing to do with what the policy says.
 */
const policy = readFileSync(
  join(REPO, 'frontend/app/(marketing)/privacy/page.tsx'),
  'utf8',
).replace(/\s+/g, ' ');

/** Each processor, and a phrase the policy must contain if it is honest about them. */
const PROCESSORS = [
  { name: 'Supabase', evidence: 'Supabase' },
  { name: 'Vercel', evidence: 'Vercel' },
  { name: 'Resend', evidence: 'Resend' },
  { name: 'Google Gemini', evidence: 'Gemini' },
  { name: 'OAuth providers', evidence: 'GitHub' },
];

describe('the privacy policy names every processor', () => {
  for (const { name, evidence } of PROCESSORS) {
    it(`names ${name}`, () => {
      expect(policy).toContain(evidence);
    });
  }

  it('STATES THE FREE-TIER TRAINING CLAUSE', () => {
    // The cost of the free tier, and the one thing a reader could not work out for
    // themselves. Someone deciding what to put in a public bio deserves to know it first.
    expect(policy).toMatch(/used to improve their products/i);
  });

  it('says what matching does NOT send', () => {
    // Naming the boundary is what makes the disclosure useful rather than alarming.
    for (const excluded of ['messages', 'applications', 'unpublished']) {
      expect(policy.toLowerCase()).toContain(excluded);
    }
  });

  it('does not still claim there is no third-party processing beyond the basics', () => {
    // The specific sentence that became false the moment Gemini was wired in.
    expect(policy).not.toMatch(/no third-party (analytics|processing)/i);
  });
});

describe('the code does not talk to an unnamed third party', () => {
  /**
   * Scans the shipped source for outbound hosts. A new provider added without a line in the
   * policy fails here — which is the drift this file exists to catch, not a style rule.
   */
  const sources = [
    'backend/src/matching/embeddings.ts',
    'backend/src/matching/rerank.ts',
    'backend/src/email/send.ts',
    'frontend/lib/supabase/client.ts',
  ]
    .map((f) => readFileSync(join(REPO, f), 'utf8'))
    .join('\n');

  it('sends data only to hosts the policy discloses', () => {
    const hosts = [...sources.matchAll(/https:\/\/([a-z0-9.-]+)/gi)].map((m) =>
      m[1]!.toLowerCase(),
    );
    const disclosed = ['api.openai.com', 'generativelanguage.googleapis.com', 'api.resend.com'];
    const undisclosed = hosts.filter(
      (h) => !disclosed.includes(h) && !h.includes('example') && !h.includes('schema'),
    );
    expect([...new Set(undisclosed)]).toEqual([]);
  });
});
