/**
 * Warm the match cache. `npm run match:warm`
 *
 * RUNS IN GITHUB ACTIONS, NOT ON VERCEL, and that is the point.
 *
 * It began as a Vercel route. Measured against hosted data, a single re-rank took 238
 * seconds — and earlier the same call took 118s, so the variance is larger than any budget
 * worth setting. Vercel Hobby caps a function at 300s, which leaves no margin at all: one
 * slow response and the function is killed mid-call, the quota is spent and nothing is
 * cached. A GitHub Actions job has hours.
 *
 * (The route in app/api/match/warm still exists for a manual nudge, but the schedule uses
 * this. A serverless function is the wrong shape for work measured in minutes.)
 *
 * Talks to Postgres directly rather than through PostgREST: it needs DATABASE_URL and
 * GEMINI_API_KEY and nothing else, so the deployed app is not in the path at all.
 */

import postgres from 'postgres';
import { GoogleGenAI } from '@google/genai';

import { RERANK_MODEL } from './config';
import { parseRerank } from './rerank-parse';
import { RERANK_RESPONSE_SCHEMA, buildRerankPrompt } from './rerank-prompt';
import { jobToText, talentToText } from './text';

const DB_URL = process.env.DATABASE_URL;
const API_KEY = process.env.GEMINI_API_KEY;
/** Stop starting new subjects after this. The job's own timeout is the outer guard. */
const BUDGET_MS = Number(process.env.WARM_BUDGET_MS ?? 25 * 60 * 1000);
const TTL_MS = 6 * 60 * 60 * 1000;
const RETRIEVAL_LIMIT = 20;

if (!DB_URL || !API_KEY) {
  console.error('DATABASE_URL and GEMINI_API_KEY are both required.');
  process.exit(1);
}

const host = DB_URL.replace(/.*@/, '').replace(/\/.*$/, '');
console.log(`[warm] database: ${/127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE'} ${host}`);
console.log(`[warm] model: ${RERANK_MODEL}  budget: ${Math.round(BUDGET_MS / 1000)}s`);

const sql = postgres(DB_URL, { max: 2, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });
const ai = new GoogleGenAI({ apiKey: API_KEY });

const startedAt = Date.now();
const expiresAt = () => new Date(Date.now() + TTL_MS).toISOString();

// Housekeeping first: the read path already ignores expired rows, but without this the table
// grows forever on a 500MB free-tier database.
const swept = await sql`delete from match_cache where expires_at < now() returning id`;
console.log(`[warm] swept ${swept.length} expired row(s)`);

/**
 * Subjects with no current ranking. Anything expiring within a quarter of the TTL counts as
 * cold, so a cache is refreshed BEFORE it lapses rather than after — a reader should never be
 * the one to discover it went stale.
 */
const cutoff = new Date(Date.now() + TTL_MS / 4).toISOString();
const coldJobs = await sql`
  select j.id, j.title from jobs j
  where j.status = 'open' and j.embedding is not null
    and not exists (
      select 1 from match_cache m
      where m.subject_type = 'job' and m.subject_id = j.id and m.expires_at > ${cutoff}
    )
  order by j.published_at desc nulls last`;

const coldTalent = await sql`
  select p.id, p.headline as title from talent_profiles p
  where p.is_published = true and p.embedding is not null
    and not exists (
      select 1 from match_cache m
      where m.subject_type = 'talent' and m.subject_id = p.id and m.expires_at > ${cutoff}
    )
  order by p.updated_at desc`;

const cold = [
  ...coldJobs.map((r) => ({ type: 'job' as const, id: r.id as string, label: r.title as string })),
  ...coldTalent.map((r) => ({ type: 'talent' as const, id: r.id as string, label: r.title as string })),
];
console.log(`[warm] ${coldJobs.length} cold job(s), ${coldTalent.length} cold profile(s)`);

async function talentText(id: string): Promise<string> {
  const [p] = await sql`select headline, bio, availability, years_experience, timezone from talent_profiles where id = ${id}`;
  if (!p) return '';
  const skills = await sql`select s.name, ts.proficiency, ts.years from talent_skills ts join skills s on s.id = ts.skill_id where ts.talent_id = ${id}`;
  const items = await sql`select title, description, role, outcome, tech_stack from portfolio_items where talent_id = ${id} order by sort_order`;
  return talentToText({
    headline: p.headline as string,
    bio: p.bio as string | null,
    availability: p.availability as string | null,
    yearsExperience: p.years_experience as number | null,
    timezone: p.timezone as string | null,
    skills: skills.map((s) => ({ name: s.name as string, proficiency: s.proficiency as string | null, years: s.years as number | null })),
    items: items.map((i) => ({ title: i.title as string, description: i.description as string, role: i.role as string | null, outcome: i.outcome as string | null, techStack: (i.tech_stack ?? []) as string[] })),
  });
}

async function jobText(id: string): Promise<string> {
  const [j] = await sql`select title, description, requirements, responsibilities, engagement_type, location_type, experience_level from jobs where id = ${id}`;
  if (!j) return '';
  const skills = await sql`select s.name, js.is_required from job_skills js join skills s on s.id = js.skill_id where js.job_id = ${id}`;
  return jobToText({
    title: j.title as string,
    description: j.description as string,
    requirements: j.requirements as string | null,
    responsibilities: j.responsibilities as string | null,
    engagementType: j.engagement_type as string | null,
    locationType: j.location_type as string | null,
    experienceLevel: j.experience_level as string | null,
    skills: skills.map((s) => ({ name: s.name as string, isRequired: s.is_required as boolean })),
  });
}

/**
 * Re-rank with retry.
 *
 * The first scheduled run warmed 11 subjects and failed 10 — a 48% failure rate, essentially
 * all of it 503 "experiencing high demand" from the free tier. Those are transient by
 * definition, and the eval harness already retried them; the warmer did not, so every blip
 * cost a subject and the quota spent reaching it.
 *
 * Backoff is linear and short rather than exponential: a 503 here means Google's scheduler is
 * busy right now, not that we are hammering it, and the loop already paces itself at one
 * request per 45+ seconds. Waiting four minutes to retry would spend the run's budget on
 * sleeping.
 */
const RERANK_ATTEMPTS = 3;

async function rerankWithRetry(brief: string, payload: { id: string; text: string; similarity: number }[]) {
  let lastDetail = 'unknown';

  for (let attempt = 1; attempt <= RERANK_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: RERANK_MODEL,
        contents: buildRerankPrompt(brief, payload),
        config: { responseMimeType: 'application/json', responseSchema: RERANK_RESPONSE_SCHEMA, temperature: 0 },
      });
      const parsed = parseRerank(response.text ?? '', payload);
      if (parsed.ok) return { ok: true as const, items: parsed.items, attempts: attempt };
      // A malformed or partial answer is worth one more ask — temperature is 0, but the
      // failure mode is the model truncating, not disagreeing with itself.
      lastDetail = parsed.detail ?? parsed.reason;
    } catch (cause) {
      lastDetail = cause instanceof Error ? cause.message.slice(0, 160) : String(cause).slice(0, 160);
      const transient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|deadline/i.test(lastDetail);
      // A 401 or a 400 will fail identically every time; retrying spends quota to learn
      // nothing.
      if (!transient) return { ok: false as const, detail: lastDetail, attempts: attempt };
    }
    if (attempt < RERANK_ATTEMPTS) await new Promise((r) => setTimeout(r, attempt * 5000));
  }

  return { ok: false as const, detail: lastDetail, attempts: RERANK_ATTEMPTS };
}

let warmed = 0;
let failed = 0;
let retried = 0;
let ranOutOfTime = false;
const failureReasons = new Map<string, number>();

for (const subject of cold) {
  if (Date.now() - startedAt > BUDGET_MS) {
    ranOutOfTime = true;
    break;
  }

  const at = Date.now();
  try {
    const [row] = await sql.unsafe(
      subject.type === 'job'
        ? 'select embedding from jobs where id = $1'
        : 'select embedding from talent_profiles where id = $1',
      [subject.id],
    );
    const embedding = (row as { embedding: string } | undefined)?.embedding;
    if (!embedding) continue;

    const candidates =
      subject.type === 'job'
        ? await sql`select * from match_talent_for_job(${embedding}::vector, ${RETRIEVAL_LIMIT}, '{}'::uuid[])`
        : await sql`select * from match_jobs_for_talent(${embedding}::vector, ${subject.id}::uuid, ${RETRIEVAL_LIMIT})`;

    if (candidates.length === 0) {
      console.log(`[warm] ${subject.type} "${subject.label.slice(0, 40)}": no candidates`);
      continue;
    }

    const payload = [];
    for (const c of candidates) {
      const text = subject.type === 'job' ? await talentText(c.id as string) : await jobText(c.id as string);
      if (text) payload.push({ id: c.id as string, text, similarity: Number(c.similarity) });
    }
    if (payload.length === 0) continue;

    const brief = subject.type === 'job' ? await jobText(subject.id) : await talentText(subject.id);
    const parsed = await rerankWithRetry(brief, payload);

    if (!parsed.ok) {
      // A fallback ranking is deliberately NOT cached: freezing a degraded result for six
      // hours because the model was busy once is worse than re-deriving it next run.
      const kind = /503|UNAVAILABLE|high demand/i.test(parsed.detail)
        ? 'busy (503)'
        : /429|RESOURCE_EXHAUSTED|quota/i.test(parsed.detail)
          ? 'rate limited'
          : /scored \d+ of/.test(parsed.detail)
            ? 'partial answer'
            : 'other';
      failureReasons.set(kind, (failureReasons.get(kind) ?? 0) + 1);
      console.warn(`[warm] ${subject.type} "${subject.label.slice(0, 40)}": ${kind} after ${parsed.attempts} attempt(s)`);
      failed++;
      continue;
    }
    if (parsed.attempts > 1) retried++;

    // Replace wholesale. A candidate in the old ranking and not the new one — unpublished,
    // or filtered out — would otherwise linger and keep being served.
    await sql`delete from match_cache where subject_type = ${subject.type} and subject_id = ${subject.id}`;
    const expires = expiresAt();
    for (const item of parsed.items) {
      await sql`insert into match_cache (subject_type, subject_id, target_id, score, reason, expires_at)
                values (${subject.type}, ${subject.id}, ${item.id}, ${item.score}, ${item.reason || null}, ${expires})`;
    }

    const scores = parsed.items.map((i) => i.score);
    warmed++;
    console.log(
      `[warm] ${subject.type} "${subject.label.slice(0, 40)}": ${parsed.items.length} ranked ${Math.min(...scores)}–${Math.max(...scores)} in ${Math.round((Date.now() - at) / 1000)}s`,
    );
  } catch (cause) {
    // One failure must not end the run — a 503 on this tier is routine, and the next subject
    // may well succeed.
    failed++;
    console.error(`[warm] ${subject.type} ${subject.id}: ${String(cause).slice(0, 180)}`);
  }
}

console.log(
  `[warm] done: ${warmed} warmed (${retried} needed a retry), ${failed} failed, ${cold.length - warmed - failed} left${ranOutOfTime ? ' (out of time)' : ''}`,
);
if (failureReasons.size > 0) {
  // Naming the shape of the failures is what distinguishes "the tier is busy" from "something
  // is broken" — they look identical in a bare count.
  console.log(`[warm] failures by kind: ${[...failureReasons].map(([k, n]) => `${k} x${n}`).join(', ')}`);
}
const [remaining] = await sql`select count(*)::int as n from match_cache`;
console.log(`[warm] match_cache now holds ${remaining!.n} row(s)`);

await sql.end();
// A run that warmed nothing and failed everything is not a success.
process.exit(warmed === 0 && failed > 0 ? 1 : 0);
