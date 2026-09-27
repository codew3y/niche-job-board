/**
 * What is pending on a database, and against WHICH database — before anything is applied.
 *
 * `drizzle-kit migrate` applies every unapplied migration without first telling you what that
 * set is. Against production that is the wrong order: you want to know whether you are about
 * to apply one function replacement or eleven months of schema change, and you want the host
 * echoed back so a hosted run cannot silently have been a local one.
 *
 * Read-only. It writes nothing and holds one connection.
 *
 *   npm run db:status
 *   DATABASE_URL="$(grep '^# DATABASE_URL=' .env | sed -E 's/^# DATABASE_URL="(.*)"$/\1/')" npm run db:status
 */

import { readFileSync } from 'node:fs';
import postgres from 'postgres';

type Entry = { idx: number; when: number; tag: string };

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Nothing to check.');
  process.exit(1);
}

/** Never print a password, and always print the host. */
const masked = url.replace(/:[^:@]+@/, ':****@');
const host = masked.replace(/^.*@/, '').replace(/\?.*$/, '');
const where = /127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE';

const sql = postgres(url, { max: 1, connect_timeout: 15, onnotice: () => {} });

async function main() {
  console.log(`\n  target: ${where}  ${host}`);
  const [who] = await sql<{ db: string; usr: string }[]>`
    select current_database() as db, current_user as usr`;
  console.log(`  database: ${who!.db}   user: ${who!.usr}\n`);

  const journal = JSON.parse(readFileSync('lib/db/migrations/meta/_journal.json', 'utf8')) as {
    entries: Entry[];
  };

  // drizzle-kit records the journal's `when` as created_at, so that is the join key.
  const applied = await sql<{ created_at: string }[]>`
    select created_at from drizzle.__drizzle_migrations order by created_at`;
  const appliedWhen = new Set(applied.map((r) => Number(r.created_at)));

  const pending = journal.entries.filter((e) => !appliedWhen.has(e.when));

  console.log(`  ${applied.length} of ${journal.entries.length} migrations applied`);
  if (pending.length === 0) {
    console.log('  PENDING: none — this database is up to date\n');
  } else {
    console.log(`  PENDING (${pending.length}), which "npm run db:migrate" would apply:`);
    for (const e of pending) console.log(`    ${e.tag}`);
    console.log('');
  }

  // The specific property 0019 exists to guarantee. Printed whether or not it is pending, so
  // this doubles as the post-apply check.
  const fns = await sql<{ proname: string; prosecdef: boolean; proconfig: string[] | null }[]>`
    select p.proname, p.prosecdef, p.proconfig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('set_updated_at', 'sync_portfolio_item_count', 'sync_user_role_flags',
                         'touch_conversation', 'purge_expired_match_cache',
                         'purge_orphaned_conversations')
     order by p.proname`;

  console.log('  Account-deletion path (migration 0019):');
  if (fns.length === 0) {
    console.log('    no such functions — is this the right database?');
  }
  for (const f of fns) {
    const path = (f.proconfig ?? []).find((c) => c.startsWith('search_path=')) ?? 'NO search_path';
    const needsDefiner = ['sync_user_role_flags', 'sync_portfolio_item_count'].includes(f.proname);
    const ok = path !== 'NO search_path' && (!needsDefiner || f.prosecdef);
    console.log(
      `    ${ok ? 'ok  ' : 'BAD '} ${f.proname.padEnd(30)} ` +
        `${needsDefiner ? `secdef=${String(f.prosecdef).padEnd(5)} ` : ''}${path}`,
    );
  }
  console.log('');
}

main()
  .catch((e: Error) => {
    console.error(`\n  FAILED against ${host}: ${e.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 5 }));
