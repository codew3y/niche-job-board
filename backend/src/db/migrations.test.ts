// Guards on the generated SQL.
//
// drizzle-kit regenerates 0000 from the schema files, which silently drops anything added by
// hand. The extension preamble is exactly that, and without it the migration fails on a fresh
// database at the first vector(1536) column — which is the "clean clone runs in 15 minutes"
// criterion in the Definition of Done.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const dir = join(import.meta.dirname, 'migrations');
const read = (f: string) => readFileSync(join(dir, f), 'utf8');
/** SQL with `--` comment lines removed, so prose about the SQL is not mistaken for SQL. */
const readCode = (f: string) =>
  read(f)
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort();

describe('migrations', () => {
  it('has at least one migration', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it('creates the vector extension before any vector column', () => {
    const first = readCode(files[0]!);
    expect(first).toMatch(/CREATE EXTENSION IF NOT EXISTS vector/i);
    expect(first.indexOf('CREATE EXTENSION IF NOT EXISTS vector')).toBeLessThan(
      first.indexOf('vector(1536)'),
    );
  });

  it('enables RLS on every table it creates', () => {
    const sql = files.map(readCode).join('\n');
    const created = [...sql.matchAll(/CREATE TABLE "([a-z_]+)"/gi)].map((m) => m[1]);
    const rlsEnabled = new Set(
      [...sql.matchAll(/ALTER TABLE "([a-z_]+)" ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1]),
    );
    const missing = created.filter((t) => !rlsEnabled.has(t));
    expect(missing).toEqual([]);
  });

  it('never grants a policy to the anon role on a private table', () => {
    // Messaging, applications and saved lists must never be readable by an anonymous visitor.
    const sql = files.map(readCode).join('\n');
    const privateTables = [
      'conversations',
      'messages',
      'blocks',
      'reports',
      'applications',
      'application_events',
      'saved_jobs',
      'saved_talent',
      'notifications',
    ];
    const leaks = privateTables.filter((t) =>
      new RegExp(`CREATE POLICY "[^"]+" ON "${t}"[^;]*TO "anon"`, 'i').test(sql),
    );
    expect(leaks).toEqual([]);
  });
});
