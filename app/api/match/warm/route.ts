import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@/lib/env';
import { sweepExpired } from '@/lib/matching/cache';
import { warmMatches } from '@/lib/matching/warm';

/**
 * Scheduled cache warming.
 *
 * Called by the GitHub Actions schedule that already keeps the Supabase project alive, so
 * there is no new piece of infrastructure and no Vercel cron (unavailable on Hobby at a
 * useful frequency).
 *
 * AUTHENTICATED BY A SHARED SECRET, and the endpoint refuses everything when that secret is
 * unset. This route spends API quota on every call: left open, it is a free
 * denial-of-wallet — anyone could drain a day's free-tier requests with a loop, and on a tier
 * that already queues for 30 seconds the damage would be silent and total.
 *
 * Compared in constant time, because a timing-variable comparison on a secret is exactly the
 * kind of detail that is obvious in hindsight.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

/**
 * A MANUAL NUDGE, not the schedule.
 *
 * The scheduled warming runs in GitHub Actions (lib/matching/warm-cli.mts), because one
 * re-rank was measured at 238 seconds against hosted data — and 118s earlier, so the variance
 * is wider than any budget worth setting. Vercel caps a function at 300s, which leaves no
 * useful margin: a slow response kills the function mid-call, spends the free-tier quota and
 * caches nothing.
 *
 * So this deliberately attempts ONE subject and returns. It is for warming a specific thing
 * on demand — a job you just posted, before a demo — and not for getting through a backlog.
 */
const BUDGET_MS = 150_000;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const { MATCH_WARM_SECRET } = serverEnv();

  if (!MATCH_WARM_SECRET) {
    // Not configured is a refusal, never a bypass. A default-open scheduled endpoint is the
    // kind of thing that ships because nobody set the variable in one environment.
    return NextResponse.json(
      { status: 'disabled', message: 'MATCH_WARM_SECRET is not configured.' },
      { status: 503 },
    );
  }

  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!timingSafeEqual(supplied, MATCH_WARM_SECRET)) {
    return NextResponse.json({ status: 'forbidden' }, { status: 403 });
  }

  const startedAt = Date.now();
  const swept = await sweepExpired();
  const result = await warmMatches(BUDGET_MS);

  return NextResponse.json(
    {
      status: 'ok',
      swept,
      warmed: result.warmed.length,
      skipped: result.skipped,
      ranOutOfTime: result.ranOutOfTime,
      subjects: result.warmed.map((w) => ({ type: w.type, count: w.count, ms: w.ms })),
      totalMs: Date.now() - startedAt,
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}

/** GET reports state without spending quota, so a deploy can be checked safely. */
export async function GET() {
  const { MATCH_WARM_SECRET, GEMINI_API_KEY } = serverEnv();
  return NextResponse.json(
    {
      configured: Boolean(MATCH_WARM_SECRET),
      canMatch: Boolean(GEMINI_API_KEY),
      hint: 'POST with Authorization: Bearer <MATCH_WARM_SECRET> to warm the cache.',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
