import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env';
import { usageToday } from '@/lib/matching/budget';
import { createClient } from '@/lib/supabase/server';

/**
 * Health check — and the keep-alive that stops the free Supabase project pausing.
 *
 * It MUST touch the database. Supabase pauses a free project after 7 days without
 * *database* activity; requests that only hit the web app, or that are served from cache,
 * do not count. A keep-alive that pings the homepage would look like it was working right up
 * until someone opened the demo link and found it dead (§11).
 *
 * The query is deliberately trivial and reads a public table, so no service-role credential
 * is involved and RLS still applies.
 *
 * It also reports WHICH optional services are configured, as booleans. Every one of them fails
 * silently by design — a missing RESEND_API_KEY means no mail is sent, a missing
 * SUPABASE_SERVICE_ROLE_KEY means no mail is sent AND no welcome is claimed, and neither
 * breaks a single user-facing action. That is the right runtime behaviour and a terrible
 * diagnostic story, because a deploy can be missing both and look perfectly healthy.
 *
 * Booleans only. Never a value, never a prefix, never a length — the question being answered
 * is "is it set", and anything more is a credential leak on a public endpoint.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  /**
   * Read before the database call, so configuration is reported even when Postgres is down —
   * which is exactly the moment someone is trying to work out what is wrong.
   */
  let config: Record<string, boolean> = {};
  try {
    const env = serverEnv();
    config = {
      // Required for notification email and for claiming the welcome send. Without it, all
      // three emails silently never send.
      serviceRoleKey: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      resendApiKey: Boolean(env.RESEND_API_KEY),
      // False means the shared onboarding@resend.dev sender, which can only deliver to the
      // Resend account owner. Mail to real users goes nowhere and looks like success.
      verifiedSender: Boolean(env.EMAIL_FROM),
    };
  } catch {
    // serverEnv throws only if a required variable is malformed, which the database check
    // below will surface anyway.
  }

  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;

    /**
     * Today's AI spend, so a cap is visible BEFORE it bites. Matching degrades silently when
     * the cap is hit — embeddings stop, re-ranking falls back to vector order — which is the
     * right runtime behaviour and impossible to notice without this.
     *
     * Counts and limits only. It reveals nothing about any user.
     */
    const ai = config.serviceRoleKey ? await usageToday().catch(() => null) : null;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'reachable',
        config,
        ai,
        skills: count ?? null,
        latencyMs: Date.now() - startedAt,
        at: new Date().toISOString(),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (_e) {
    // Deliberately unused: the driver error can carry connection details, so it is never
    // echoed to the caller. Log it server-side if this ever needs diagnosing.
    // 503 rather than 500: this is "dependency unavailable", which is what an uptime monitor
    // needs to distinguish from a bug in the app.
    return NextResponse.json(
      {
        status: 'error',
        database: 'unreachable',
        config,
        // Never echo the driver error — it can carry connection details.
        message: 'Database did not respond.',
        latencyMs: Date.now() - startedAt,
        at: new Date().toISOString(),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
