import type postgres from 'postgres';
import { expect, it } from 'vitest';

/**
 * Announce, inside a test, which database a suite actually measured.
 *
 * There was already an announcement in each DB suite — a console.info at module scope, added
 * after a run aimed at hosted silently tested localhost. It never appeared. Vitest's reporter
 * only surfaces console output produced while a task is running; anything logged at module
 * scope is captured before the file has a task context and is dropped on the floor.
 *
 * So the safeguard against a silent wrong-target run was itself silent, and vitest.config.ts
 * documented it as working. Putting it in a real `it()` is what makes it visible on a green
 * run, which is the only run where nobody is already looking.
 *
 * It asserts as well as prints: a suite whose connection has quietly died mid-run fails here
 * rather than reporting a page of passing negative assertions, which is how "no rows returned"
 * turns into a false clean bill of health.
 */
export function itAnnouncesTarget(sql: postgres.Sql, url: string) {
  const masked = url.replace(/:[^:@]+@/, ':****@');
  const host = masked.replace(/^.*@/, '').replace(/\?.*$/, '');
  const where = /127\.0\.0\.1|localhost/.test(host) ? 'LOCAL' : 'REMOTE';

  it(`runs against ${where} — ${host}`, async () => {
    const [row] = await sql`select current_database() as db`;
    console.info(`  target: ${where} ${masked}`);
    expect(row?.db).toBeTruthy();
  });
}
