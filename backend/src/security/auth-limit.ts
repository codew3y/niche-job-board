import 'server-only';

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { createServiceClient } from '../supabase/server';

/**
 * Attempt limits for the auth actions (migration 0027).
 *
 * Supabase Auth limits by IP, but these actions reach it from the server, so every visitor
 * arrives from Vercel's address and shares one allowance. Counting here, per visitor IP and per
 * email address, puts the limit on the person making the attempts.
 *
 * Per email as well as per IP, because guessing one account's password from many addresses is
 * the attack that matters. The price is that someone can make an account wait out the window by
 * failing on purpose; the windows are short for that reason.
 */
const LIMITS = {
  signIn: { ip: [20, 5 * 60], email: [8, 15 * 60] },
  signUp: { ip: [5, 60 * 60], email: [3, 60 * 60] },
  passwordReset: { ip: [10, 60 * 60], email: [3, 60 * 60] },
} as const satisfies Record<string, Record<'ip' | 'email', readonly [number, number]>>;

export type AuthAction = keyof typeof LIMITS;

/**
 * Vercel sets x-forwarded-for itself, overwriting anything the visitor sent, so its first entry
 * is the visitor's address. Elsewhere it is whatever the proxy in front says.
 */
async function visitorIp(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
}

/** Stored hashed: the table only ever needs to tell two addresses apart, never read one. */
const emailKey = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex');

/**
 * Record an attempt, or refuse it. Returns false when the visitor or the address is over the
 * limit.
 *
 * FAILS OPEN if the counter is unavailable (no service key, migration not applied, database
 * error), like reserveCall in matching/budget.ts: Supabase's own limits still stand behind this,
 * and a counter outage must not lock everyone out of their accounts.
 */
export async function allowAuthAttempt(action: AuthAction, email: string): Promise<boolean> {
  // Test hook: the end-to-end suite signs in dozens of times from one address, so
  // playwright.config.ts sets AUTH_RATE_LIMITS=off. Ignored on Vercel, like RESUME_IMPORT_FIXTURE
  // (backend/src/import/extract.ts), so no deployed environment can be switched off.
  if (!process.env.VERCEL && process.env.AUTH_RATE_LIMITS === 'off') return true;

  const limits = LIMITS[action];
  const keys = [
    [`${action}:ip:${await visitorIp()}`, ...limits.ip],
    [`${action}:email:${emailKey(email)}`, ...limits.email],
  ] as const;

  try {
    const service = createServiceClient();
    for (const [key, limit, windowSeconds] of keys) {
      const { data, error } = await service.rpc('reserve_auth_attempt', {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) {
        console.warn(`[auth-limit] could not check ${action}: ${error.message}`);
        return true;
      }
      if (data === false) return false;
    }
    return true;
  } catch (cause) {
    console.warn(`[auth-limit] check threw for ${action}: ${String(cause).slice(0, 120)}`);
    return true;
  }
}
