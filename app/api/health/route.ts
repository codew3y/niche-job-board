import { NextResponse } from 'next/server';

import { serverEnv } from '@/lib/env';
import { usageToday } from '@/lib/matching/budget';
import { hasBearer } from '@/lib/security/bearer';
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
 * is "is it set", and anything more is a credential leak.
 *
 * TWO AUDIENCES, TWO ANSWERS. The endpoint is public (the keep-alive has no session), so an
 * anonymous caller gets only what an uptime monitor needs: `status` and `database`. Which
 * integrations are configured, whether the service-role key works, today's AI spend and the
 * step timings are a map of the deployment for anyone probing it, so they are returned only
 * with `Authorization: Bearer <MATCH_WARM_SECRET>` (the operator secret that already guards
 * /api/match/warm). The database is still touched on every call, so the keep-alive still
 * resets Supabase's pause timer.
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const startedAt = Date.now();
  let detailed = false;

  /**
   * Read before the database call, so configuration is reported even when Postgres is down —
   * which is exactly the moment someone is trying to work out what is wrong.
   */
  let config: Record<string, boolean> = {};
  try {
    const env = serverEnv();
    detailed = hasBearer(request, env.MATCH_WARM_SECRET);
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

  /**
   * Per-step timings, not just a total.
   *
   * A single latencyMs said 7.4s and could not say which of three steps spent it — the
   * anon-key query, the service-role query, or client construction. A health endpoint that
   * reports a number nobody can act on is a number, not a diagnostic.
   */
  const timings: Record<string, number> = {};
  const timed = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const at = Date.now();
    try {
      return await fn();
    } finally {
      timings[name] = Date.now() - at;
    }
  };

  try {
    const supabase = await timed('createClient', async () => createClient());
    // Awaited inside the closure: a PostgrestFilterBuilder is thenable but not a Promise,
    // so returning it directly gives back the builder rather than the result.
    const { error, count } = await timed('skillsCount', async () =>
      supabase.from('skills').select('id', { count: 'exact', head: true }).limit(1),
    );

    if (error) throw error;

    /**
     * Today's AI spend, so a cap is visible BEFORE it bites. Matching degrades silently when
     * the cap is hit — embeddings stop, re-ranking falls back to vector order — which is the
     * right runtime behaviour and impossible to notice without this.
     *
     * Counts and limits only. It reveals nothing about any user.
     */
    /**
     * Two service-role timings, not one. `aiUsage` measured 7005ms while the anon-key query
     * beside it measured 572ms — which does not say whether the cost is the service-role
     * CLIENT or the ai_usage TABLE. Timing a service-role read of the same `skills` table the
     * anon client just read separates them: if both service-role calls are slow it is the
     * key, if only ai_usage is slow it is the table.
     */
    const ai =
      detailed && config.serviceRoleKey
        ? await timed('aiUsage', () => usageToday().catch(() => null))
        : null;

    /**
     * Whether the service-role client actually WORKS, as a boolean and nothing more.
     *
     * `config.serviceRoleKey` only reports that the variable is set, which is how a key with
     * a newline pasted into the middle of it read as healthy while every notification email
     * silently failed for days.
     *
     * NEVER ECHO THE PROVIDER ERROR HERE. This endpoint is public, and the error for a
     * malformed key quotes the key back — which is exactly how this diagnostic briefly
     * published a fragment of a live credential. The reason is logged server-side; the
     * response carries a boolean.
     */
    let serviceRoleWorks = false;
    if (detailed && config.serviceRoleKey) {
      await timed('serviceRoleCheck', async () => {
        try {
          const { createServiceClient } = await import('@/lib/supabase/server');
          const { error } = await createServiceClient().from('skills').select('id').limit(1);
          serviceRoleWorks = !error;
          if (error) console.error('[health] service-role query failed:', error.message);
        } catch (cause) {
          console.error('[health] service-role client threw:', String(cause).slice(0, 200));
        }
      });
    }

    const at = new Date().toISOString();
    return NextResponse.json(
      detailed
        ? {
            status: 'ok',
            database: 'reachable',
            config,
            ai,
            serviceRoleWorks,
            timings,
            skills: count ?? null,
            latencyMs: Date.now() - startedAt,
            at,
          }
        : { status: 'ok', database: 'reachable', at },
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
        ...(detailed ? { config, latencyMs: Date.now() - startedAt } : {}),
        // Never echo the driver error — it can carry connection details.
        message: 'Database did not respond.',
        at: new Date().toISOString(),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
