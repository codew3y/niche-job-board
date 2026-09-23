/**
 * Environment parsing.
 *
 * The case that matters: `KEY=` in a .env file. dotenv loads that as an empty STRING, not as
 * undefined, so `.optional()` does not cover it — `.optional()` permits undefined only. A
 * blank optional variable therefore failed its own validator and took the entire server
 * environment down with it, because parseOrThrow throws on any issue.
 *
 * The blast radius was not "config reporting looks odd": serverEnv() throwing means
 * createServiceClient() throws, which means every notification email fails silently.
 *
 * Found by adding a documented, intentionally blank EMAIL_FROM= to .env.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), schema);

const schema = z.object({
  SERVICE_KEY: blankAsUndefined(z.string().min(20).optional()),
  RESEND: blankAsUndefined(z.string().startsWith('re_').optional()),
  FROM: blankAsUndefined(z.string().min(3).optional()),
  SITE: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.url().optional(),
  ),
});

describe('blank optional variables', () => {
  it('ACCEPTS KEY= AS NOT SET, rather than failing its validator', () => {
    const result = schema.safeParse({ SERVICE_KEY: '', RESEND: '', FROM: '', SITE: '' });
    expect(result.success).toBe(true);
    expect(result.data?.FROM).toBeUndefined();
    expect(result.data?.SITE).toBeUndefined();
  });

  it('treats whitespace as blank too', () => {
    expect(schema.safeParse({ FROM: '   ' }).success).toBe(true);
  });

  it('accepts a genuinely absent variable', () => {
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('STILL REJECTS A WRONG VALUE — blank is not a way to smuggle anything through', () => {
    expect(schema.safeParse({ RESEND: 'sk_live_wrongprovider' }).success).toBe(false);
    expect(schema.safeParse({ SERVICE_KEY: 'too-short' }).success).toBe(false);
    expect(schema.safeParse({ SITE: 'not-a-url' }).success).toBe(false);
  });

  it('accepts correct values unchanged', () => {
    const result = schema.safeParse({
      SERVICE_KEY: 'sb_secret_' + 'x'.repeat(30),
      RESEND: 're_' + 'x'.repeat(30),
      FROM: 'TechSelect <hello@example.com>',
      SITE: 'https://techselect.vercel.app',
    });
    expect(result.success).toBe(true);
    expect(result.data?.FROM).toBe('TechSelect <hello@example.com>');
  });

  it('accepts both the legacy JWT and the new sb_secret_ key format', () => {
    // Supabase is migrating service_role JWTs to sb_secret_ keys; the app must take either.
    const jwt = `eyJhbGciOi.${'x'.repeat(40)}.${'y'.repeat(20)}`;
    expect(schema.safeParse({ SERVICE_KEY: jwt }).success).toBe(true);
    expect(schema.safeParse({ SERVICE_KEY: 'sb_secret_' + 'z'.repeat(30) }).success).toBe(true);
  });
});
