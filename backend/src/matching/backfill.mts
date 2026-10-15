/**
 * Embed everything that needs it. `npm run embed:backfill`
 *
 * Two jobs, and the second is the important one:
 *
 *  1. Initial backfill — nothing is embedded when matching first ships.
 *  2. THE SAFETY NET for ingest. `embedInBackground` is in-process: on Vercel a function can
 *     be frozen once the response is sent, so a send may never finish, and a deploy mid-flight
 *     drops whatever was queued. Re-running this picks up anything missed. That is why it
 *     exists as a maintained script rather than a one-off migration.
 *
 * Idempotent by default: only rows whose embedding is missing or older than their content are
 * touched. `--all` forces a full re-embed, which is what a model change requires — vectors
 * from two models are not comparable, so a partial re-embed is worse than none.
 *
 * Sequential with a small delay rather than parallel. The free tier allows ~100 requests a
 * minute; firing 45 at once wins nothing (the whole run is seconds either way) and a 429
 * storm costs more than the pause.
 */

import postgres from 'postgres';
import { GoogleGenAI } from '@google/genai';

import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL, EMBEDDING_TASK_TYPE } from './config';
import { isEmbeddable, itemToText, jobToText, talentToText } from './text';

const DB_URL = process.env.DATABASE_URL;
const API_KEY = process.env.GEMINI_API_KEY;
const FORCE = process.argv.includes('--all');

if (!DB_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
if (!API_KEY) {
  console.error('GEMINI_API_KEY is not set — nothing can be embedded without it.');
  process.exit(1);
}

const host = DB_URL.replace(/.*@/, '').replace(/\/.*$/, '');
console.log(`[backfill] database: ${/127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE'} ${host}`);
console.log(`[backfill] model: ${EMBEDDING_MODEL} @ ${EMBEDDING_DIMENSIONS}d${FORCE ? ' (forcing full re-embed)' : ''}`);

const sql = postgres(DB_URL, { max: 2, idle_timeout: 20, connect_timeout: 15, onnotice: () => {} });
const ai = new GoogleGenAI({ apiKey: API_KEY });

const PAUSE_MS = 250;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function embedText(text: string): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: EMBEDDING_TASK_TYPE },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(`expected ${EMBEDDING_DIMENSIONS} dimensions, got ${values?.length ?? 'none'}`);
  }
  const magnitude = Math.sqrt(values.reduce((s, v) => s + v * v, 0));
  return magnitude === 0 ? values : values.map((v) => v / magnitude);
}

const vec = (values: number[]) => `[${values.join(',')}]`;

type Row = { id: string; text: string };

async function run(label: string, table: string, rows: Row[]) {
  let embedded = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    if (!isEmbeddable(row.text)) {
      // Store nothing rather than a vector built from a headline. Retrieval skips NULL, so the
      // row simply does not compete until its author gives it something to compete with.
      await sql.unsafe(`update ${table} set embedding = null, embedding_updated_at = null where id = $1`, [row.id]);
      skipped++;
      continue;
    }
    try {
      const embedding = await embedText(row.text);
      await sql.unsafe(
        `update ${table} set embedding = $1::vector, embedding_updated_at = now() where id = $2`,
        [vec(embedding), row.id],
      );
      await sql`delete from embedding_failures where entity_id = ${row.id}`;
      embedded++;
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      failed++;
      console.error(`  ${label} ${row.id}: ${detail.slice(0, 160)}`);
      await sql`
        insert into embedding_failures (entity_type, entity_id, attempts, last_error, last_failed_at)
        values (${entityTypeFor(table)}, ${row.id}, 1, ${detail.slice(0, 500)}, now())
        on conflict (entity_type, entity_id) do update
          set attempts = embedding_failures.attempts + 1,
              last_error = excluded.last_error,
              last_failed_at = now()`;
    }
    await sleep(PAUSE_MS);
  }

  console.log(`[backfill] ${label}: ${embedded} embedded, ${skipped} too sparse, ${failed} failed`);
  return failed;
}

function entityTypeFor(table: string) {
  return table === 'talent_profiles' ? 'talent_profile' : table === 'jobs' ? 'job' : 'portfolio_item';
}

/** Stale = never embedded, or the row changed after it was. */
const staleClause = FORCE ? '' : 'and (embedding is null or embedding_updated_at is null or embedding_updated_at < updated_at)';

const talentRows = await sql.unsafe<
  { id: string; headline: string; bio: string | null; availability: string | null; years_experience: number | null; timezone: string | null }[]
>(`select id, headline, bio, availability, years_experience, timezone
   from talent_profiles where is_published = true ${staleClause}`);

const talent: Row[] = [];
for (const p of talentRows) {
  const skills = await sql`
    select s.name, ts.proficiency, ts.years from talent_skills ts
    join skills s on s.id = ts.skill_id where ts.talent_id = ${p.id}`;
  const items = await sql`
    select title, description, role, outcome, tech_stack from portfolio_items
    where talent_id = ${p.id} order by sort_order`;
  talent.push({
    id: p.id,
    text: talentToText({
      headline: p.headline,
      bio: p.bio,
      availability: p.availability,
      yearsExperience: p.years_experience,
      timezone: p.timezone,
      skills: skills.map((s) => ({ name: s.name as string, proficiency: s.proficiency as string, years: s.years as number })),
      items: items.map((i) => ({
        title: i.title as string,
        description: i.description as string,
        role: i.role as string | null,
        outcome: i.outcome as string | null,
        techStack: (i.tech_stack ?? []) as string[],
      })),
    }),
  });
}

const jobRows = await sql.unsafe<
  { id: string; title: string; description: string; requirements: string | null; responsibilities: string | null; engagement_type: string | null; location_type: string | null; experience_level: string | null }[]
>(`select id, title, description, requirements, responsibilities, engagement_type, location_type, experience_level
   from jobs where status = 'open' ${staleClause}`);

const jobs: Row[] = [];
for (const j of jobRows) {
  const skills = await sql`
    select s.name, js.is_required from job_skills js
    join skills s on s.id = js.skill_id where js.job_id = ${j.id}`;
  jobs.push({
    id: j.id,
    text: jobToText({
      title: j.title,
      description: j.description,
      requirements: j.requirements,
      responsibilities: j.responsibilities,
      engagementType: j.engagement_type,
      locationType: j.location_type,
      experienceLevel: j.experience_level,
      skills: skills.map((s) => ({ name: s.name as string, isRequired: s.is_required as boolean })),
    }),
  });
}

const itemRows = await sql.unsafe<
  { id: string; title: string; description: string; role: string | null; outcome: string | null; tech_stack: string[] }[]
>(`select i.id, i.title, i.description, i.role, i.outcome, i.tech_stack
   from portfolio_items i join talent_profiles p on p.id = i.talent_id
   where p.is_published = true ${staleClause.replace(/embedding_updated_at < updated_at/, 'i.embedding_updated_at < i.updated_at').replace(/embedding is null/, 'i.embedding is null').replace(/embedding_updated_at is null/, 'i.embedding_updated_at is null')}`);

const items: Row[] = itemRows.map((i) => ({
  id: i.id,
  text: itemToText({
    title: i.title,
    description: i.description,
    role: i.role,
    outcome: i.outcome,
    techStack: (i.tech_stack ?? []) as string[],
  }),
}));

console.log(`[backfill] ${talent.length} profiles, ${jobs.length} jobs, ${items.length} items to consider`);

let failures = 0;
failures += await run('profile', 'talent_profiles', talent);
failures += await run('job', 'jobs', jobs);
failures += await run('item', 'portfolio_items', items);

const [pending] = await sql`select count(*)::int as n from embedding_failures`;
console.log(`[backfill] dead-letter rows outstanding: ${pending!.n}`);

await sql.end();
process.exit(failures > 0 ? 1 : 0);
