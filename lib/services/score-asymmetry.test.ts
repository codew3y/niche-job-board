/**
 * ADR-007 D2: a client sees ORDERING and a written REASON, never a numeric match score.
 * Talent sees their own score, on their own matches only.
 *
 * The asymmetry is the point. A visible number is a number people optimise against — profiles
 * get written for the scorer rather than for the reader, and a client starts filtering on
 * "above 80" as though the figure meant something calibrated. The written reason carries the
 * same information in a form nobody can game into a threshold.
 *
 * Tested at two layers, because the rule can be broken at either:
 *   - the database, where `match_cache` has no `authenticated` policy at all, so a client
 *     cannot read scores even with a crafted request
 *   - the component, which must not render a score even when one is handed to it
 *
 * The ranking itself arrives in Phase 4. This file pins the CONSTRAINT that ranking must
 * satisfy, which is deliberately written first — retrofitting "and now hide the number" after
 * a scoring feature exists is how the number ends up shipped.
 */

import { readFileSync } from 'node:fs';

import { afterAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from '../db/test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: postgres.Sql = postgres(DB_URL, {
  max: 2,
  idle_timeout: 5,
  connect_timeout: 5,
  onnotice: () => {},
});
const reachable = await sql`select 1`.then(
  () => true,
  () => false,
);

afterAll(async () => {
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

describe('the client-facing match service never returns a score', () => {
  const source = readFileSync('lib/services/matches.ts', 'utf8');

  it('CandidateMatch HAS NO SCORE FIELD', () => {
    // Enforced in the service, not the component. Leaving it to the UI means one forgotten
    // prop leaks the number — and a type that cannot carry a score cannot leak one.
    const type = source.slice(
      source.indexOf('export type CandidateMatch'),
      source.indexOf('export type MatchFeed'),
    );
    expect(type).not.toMatch(/\bscore\b\s*:/);
    expect(type).toMatch(/reason/);
  });

  it('TalentMatch DOES carry a score — the other half of the asymmetry', () => {
    // Talent see their own score on their own matches. An asymmetry tested in only one
    // direction is half a rule.
    const type = source.slice(
      source.indexOf('export type TalentMatch'),
      source.indexOf('export type CandidateMatch'),
    );
    expect(type).toMatch(/score: number \| null/);
  });

  it('the display threshold is the same number the eval gate measures', () => {
    // If these drift, the product shows "strong match" for scores the eval proved weak.
    expect(source).toMatch(/STRONG_MATCH_SCORE = 70/);
  });
});

describe('the candidate list never renders a score', () => {
  const source = readFileSync('components/application/candidate-list.tsx', 'utf8');

  it('DOES NOT REFERENCE A SCORE FIELD AT ALL', () => {
    // Not "does not display it" — does not receive it. A component that takes a score and
    // chooses not to show it is one careless JSX edit from showing it.
    expect(source).not.toMatch(/\bmatch_score\b/);
    expect(source).not.toMatch(/\bscore\b\s*[:.]/);
  });

  it('renders the written reason, which is what replaces the number', () => {
    expect(source).toContain('match_reason');
  });

  it('states the rule where the next person will edit it', () => {
    expect(source).toMatch(/ADR-007 D2/);
  });
});

const maybe = reachable ? describe : describe.skip;

maybe('match_cache is unreachable by ordinary users', () => {
  it('HAS NO POLICY FOR THE authenticated ROLE', async () => {
    // The service role reads it and decides what to expose. Adding an `authenticated` policy
    // here would make the score readable by anyone who can open devtools.
    const policies = await sql`
      select polname, polroles::regrole[]::text[] as roles
      from pg_policy where polrelid = 'match_cache'::regclass`;
    const exposed = policies.filter((p) => (p.roles as string[]).includes('authenticated'));
    expect(exposed.map((p) => p.polname)).toEqual([]);
  });

  it('has RLS enabled, so "no policy" means "no access" rather than "open"', async () => {
    // Without RLS enabled, zero policies would mean unrestricted access — the exact inversion
    // of what the line above is trying to prove.
    const [row] =
      await sql`select relrowsecurity from pg_class where oid = 'match_cache'::regclass`;
    expect(row!.relrowsecurity).toBe(true);
  });
});
