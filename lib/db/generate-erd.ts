/**
 * Generates docs/schema.md from the Drizzle migration snapshot.
 *
 * Drizzle-first means the schema files are the spec and the ERD is DERIVED. A hand-drawn
 * diagram drifts from a strict-TypeScript schema within a week and then quietly misleads
 * whoever reads it next (PROJECT.md §0).
 *
 * Run: npx tsx lib/db/generate-erd.ts   (or `npm run db:erd`)
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Column = {
  name: string;
  type: string;
  primaryKey?: boolean;
  notNull?: boolean;
  default?: unknown;
};
type ForeignKey = {
  name: string;
  tableFrom: string;
  columnsFrom: string[];
  tableTo: string;
  columnsTo: string[];
  onDelete?: string;
};
type Table = {
  name: string;
  schema?: string;
  columns: Record<string, Column>;
  indexes: Record<string, { name: string; columns: unknown[]; isUnique?: boolean; method?: string }>;
  foreignKeys: Record<string, ForeignKey>;
  compositePrimaryKeys: Record<string, { name: string; columns: string[] }>;
  uniqueConstraints: Record<string, { name: string; columns: string[] }>;
  checkConstraints?: Record<string, { name: string; value: string }>;
  policies?: Record<string, { name: string; as?: string; for?: string; to?: string[]; using?: string; withCheck?: string }>;
  isRLSEnabled?: boolean;
};
type Snapshot = { tables: Record<string, Table>; enums: Record<string, { name: string; values: string[] }> };

const root = join(import.meta.dirname, '..', '..');
const metaDir = join(import.meta.dirname, 'migrations', 'meta');

const latest = readdirSync(metaDir)
  .filter((f) => f.endsWith('_snapshot.json'))
  .sort()
  .at(-1);
if (!latest) throw new Error('No Drizzle snapshot found — run `npm run db:generate` first.');

const snap: Snapshot = JSON.parse(readFileSync(join(metaDir, latest), 'utf8'));
const tables = Object.values(snap.tables).sort((a, b) => a.name.localeCompare(b.name));

/** Mermaid chokes on the punctuation Postgres type names carry. */
const mermaidType = (t: string) =>
  t.replace(/\(.*?\)/g, '').replace(/[^A-Za-z0-9_]/g, '_').replace(/_+$/, '') || 'unknown';

const erd: string[] = ['erDiagram'];
for (const t of tables) {
  const cols = Object.values(t.columns);
  erd.push(`  ${t.name} {`);
  for (const c of cols) {
    const pk = c.primaryKey ? ' PK' : '';
    const fk = Object.values(t.foreignKeys).some((f) => f.columnsFrom.includes(c.name)) ? ' FK' : '';
    erd.push(`    ${mermaidType(c.type)} ${c.name}${pk || fk}`);
  }
  erd.push('  }');
}
for (const t of tables) {
  for (const fk of Object.values(t.foreignKeys)) {
    const optional = Object.values(t.columns).some(
      (c) => fk.columnsFrom.includes(c.name) && !c.notNull,
    );
    erd.push(`  ${fk.tableTo} ${optional ? '||--o{' : '||--|{'} ${fk.tableFrom} : "${fk.columnsFrom.join(',')}"`);
  }
}

const totalPolicies = tables.reduce((n, t) => n + Object.keys(t.policies ?? {}).length, 0);
const rlsOn = tables.filter((t) => t.isRLSEnabled).length;
const totalChecks = tables.reduce((n, t) => n + Object.keys(t.checkConstraints ?? {}).length, 0);

const detail = tables
  .map((t) => {
    const checks = Object.values(t.checkConstraints ?? {});
    const policies = Object.values(t.policies ?? {});
    const idx = Object.values(t.indexes);
    const parts: string[] = [`### \`${t.name}\`\n`];

    parts.push('| Column | Type | Null | Notes |');
    parts.push('|---|---|---|---|');
    for (const c of Object.values(t.columns)) {
      const fk = Object.values(t.foreignKeys).find((f) => f.columnsFrom.includes(c.name));
      const notes = [
        c.primaryKey ? 'PK' : '',
        fk ? `FK → \`${fk.tableTo}\`${fk.onDelete ? ` (on delete ${fk.onDelete})` : ''}` : '',
        c.default !== undefined ? `default \`${String(c.default)}\`` : '',
      ]
        .filter(Boolean)
        .join(' · ');
      parts.push(`| \`${c.name}\` | \`${c.type}\` | ${c.notNull ? 'no' : 'yes'} | ${notes} |`);
    }

    if (checks.length) {
      parts.push('\n**Check constraints** — rules the database enforces so the service layer cannot bypass them:\n');
      for (const c of checks) parts.push(`- \`${c.name}\`: \`${c.value.replace(/\s+/g, ' ').trim()}\``);
    }
    if (idx.length) {
      parts.push('\n**Indexes**\n');
      for (const i of idx) {
        parts.push(`- \`${i.name}\`${i.isUnique ? ' (unique)' : ''}${i.method && i.method !== 'btree' ? ` — \`${i.method}\`` : ''}`);
      }
    }
    parts.push(`\n**RLS:** ${t.isRLSEnabled ? 'enabled' : '**NOT ENABLED**'} · ${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}\n`);
    if (policies.length) {
      parts.push('| Policy | For | To | Condition |');
      parts.push('|---|---|---|---|');
      for (const p of policies) {
        const cond = (p.using ?? p.withCheck ?? '').replace(/\s+/g, ' ').trim();
        parts.push(
          `| \`${p.name}\` | ${p.for ?? 'all'} | ${(p.to ?? []).join(', ') || '—'} | \`${cond.length > 160 ? cond.slice(0, 157) + '…' : cond}\` |`,
        );
      }
    }
    return parts.join('\n');
  })
  .join('\n\n');

const doc = `# Database Schema

> **Generated file — do not edit by hand.** Produced from \`${latest}\` by
> \`lib/db/generate-erd.ts\`. Regenerate with \`npm run db:erd\` after every
> \`npm run db:generate\`.
>
> The Drizzle schema files in \`lib/db/schema/\` are the source of truth (Phase 1 was built
> Drizzle-first). A hand-drawn ERD drifts from a strict-TypeScript schema within a week, and
> a diagram that is confidently wrong is worse than no diagram (PROJECT.md §0).

**${tables.length} tables · ${rlsOn}/${tables.length} with RLS enabled · ${totalPolicies} policies · ${totalChecks} check constraints · ${Object.keys(snap.enums).length} enums**

## Entity relationships

\`\`\`mermaid
${erd.join('\n')}
\`\`\`

## Design decisions visible in this schema

- **Roles are separate profile tables** (\`talent_profiles\`, \`client_profiles\`) linked to one
  \`auth.users\` row — never a role column. That is what makes dual-role accounts work without
  a flag leaking into every query (PROJECT.md §5.1).
- **The publish gate is a CHECK**, not only a Zod refinement: \`talent_publish_gate\` requires a
  non-empty bio AND (\`website_url\` OR ≥2 portfolio items). Because a CHECK cannot run a
  subquery, \`portfolio_item_count\` is maintained by trigger — if that counter drifts, the gate
  is decorative (ADR-004).
- **\`website_checked_at\` / \`website_status\` exist but are never written in v1** (ADR-007 D3).
  Two nullable columns now cost nothing; adding them later to a live RLS-protected table costs
  a migration.
- **Messaging is participant-only at the database** (ADR-007 D1). The block check is
  re-evaluated per message, not only at thread creation, and \`blocks\` is readable only by the
  blocker — so a blocked user cannot discover the block by reading the table.
- **\`match_cache\` has no \`authenticated\` policy at all.** It is served through the service
  role, which applies the ADR-007 D2 asymmetry: talent sees its own score, clients get ordering
  and a reason. Exposing the table would hand clients the number the policy layer withholds.
- **\`application_events\` has no INSERT policy.** Rows come from a \`SECURITY DEFINER\` trigger:
  an audit log a user can write is not an audit log.

## Enums

${Object.values(snap.enums)
  .map((e) => `- \`${e.name}\`: ${e.values.map((v) => `\`${v}\``).join(' · ')}`)
  .join('\n')}

## Tables

${detail}
`;

writeFileSync(join(root, 'docs', 'schema.md'), doc);
console.log(
  `docs/schema.md written from ${latest} — ${tables.length} tables, ${totalPolicies} policies, ${totalChecks} checks`,
);
