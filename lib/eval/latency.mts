/**
 * Measure the read-path latency the Phase 4 exit criterion is about. `npm run bench:match`
 *
 * PROJECT.md §8 exits on "ranked results in < 800ms p95 (measured against a WARM Supabase
 * project — state that assumption)". Two things that phrasing settles, and both matter:
 *
 *  - WARM. A free Supabase project pauses after inactivity and the first query afterwards
 *    pays a cold start measured in seconds. That is a hosting characteristic, not a property
 *    of the matching code, so the run below warms the connection first and says so.
 *
 *  - READ PATH. This measures serving a ranking, not computing one. Computing takes 30-240s
 *    on the free tier, which is exactly why rankings are precomputed and cached. Measuring
 *    the compute path against an 800ms budget would be measuring the wrong thing on purpose.
 *
 * Reports p50, p95 and p99 rather than a mean. A mean hides the tail, and the tail is what a
 * user notices.
 *
 * THE MEASUREMENT INCLUDES THE NETWORK HOP FROM WHEREVER THIS RUNS. Run from a laptop against
 * ap-south-1, a ~180ms round trip is in every number below — which makes the result
 * pessimistic rather than flattering, since Vercel's functions sit closer to the database
 * than a developer's machine does. A pass here is therefore a floor, not a best case, and
 * that is the right direction for a budget to be wrong in.
 */

import postgres from 'postgres';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error('DATABASE_URL is required.');
  process.exit(1);
}

const ITERATIONS = Number(process.env.BENCH_ITERATIONS ?? 40);
const BUDGET_MS = 800;

const host = DB_URL.replace(/.*@/, '').replace(/\/.*$/, '');
console.log(`[bench] database: ${/127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE'} ${host}`);

const sql = postgres(DB_URL, { max: 4, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });

const subjects = await sql`
  select subject_type, subject_id from match_cache
  where expires_at > now() group by 1, 2 limit 20`;

if (subjects.length === 0) {
  console.error('[bench] no warm rankings to measure. Run npm run match:warm first.');
  await sql.end();
  process.exit(1);
}
console.log(`[bench] ${subjects.length} warm subject(s), ${ITERATIONS} iterations`);

/** Warm the pool and the planner. The first query pays for both and is not representative. */
for (let i = 0; i < 5; i++) {
  await sql`select 1 from match_cache limit 1`;
}

const timings: number[] = [];

for (let i = 0; i < ITERATIONS; i++) {
  const subject = subjects[i % subjects.length]!;
  const at = performance.now();

  /**
   * The query the read path issues: cached ranking for a subject, unexpired, best first —
   * then the rows it joins to render. Both, because measuring the cache read alone would
   * report a number no page can achieve.
   */
  const ranked = await sql`
    select target_id, score, reason from match_cache
    where subject_type = ${subject.subject_type} and subject_id = ${subject.subject_id}
      and expires_at > now()
    order by score desc`;

  if (ranked.length > 0) {
    const ids = ranked.map((r) => r.target_id as string);
    if (subject.subject_type === 'job') {
      await sql`select id, slug, headline, portfolio_item_count, website_url
                from talent_profiles where id = any(${ids}::uuid[]) and is_published = true`;
    } else {
      await sql`select id, slug, title, budget_min, budget_max, currency, engagement_type, location_type
                from jobs where id = any(${ids}::uuid[]) and status = 'open'`;
    }
  }

  timings.push(performance.now() - at);
}

timings.sort((a, b) => a - b);
const pct = (p: number) => timings[Math.min(timings.length - 1, Math.floor((p / 100) * timings.length))]!;

const p50 = pct(50);
const p95 = pct(95);
const p99 = pct(99);

console.log('');
console.log(`  p50  ${p50.toFixed(1)}ms`);
console.log(`  p95  ${p95.toFixed(1)}ms   (budget ${BUDGET_MS}ms)`);
console.log(`  p99  ${p99.toFixed(1)}ms`);
console.log(`  min  ${timings[0]!.toFixed(1)}ms   max ${timings.at(-1)!.toFixed(1)}ms`);
console.log('');
console.log(
  p95 < BUDGET_MS
    ? `[bench] PASS — p95 ${p95.toFixed(1)}ms is inside the ${BUDGET_MS}ms budget (warm project).`
    : `[bench] FAIL — p95 ${p95.toFixed(1)}ms exceeds the ${BUDGET_MS}ms budget.`,
);

await sql.end();
process.exit(p95 < BUDGET_MS ? 0 : 1);
