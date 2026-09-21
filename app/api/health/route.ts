import { NextResponse } from 'next/server';

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
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const startedAt = Date.now();

  try {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from('skills')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;

    return NextResponse.json(
      {
        status: 'ok',
        database: 'reachable',
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
        // Never echo the driver error — it can carry connection details.
        message: 'Database did not respond.',
        latencyMs: Date.now() - startedAt,
        at: new Date().toISOString(),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
