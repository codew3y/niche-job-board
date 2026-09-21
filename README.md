# TechSelect

A job board for **software, web and automation work** where shipped projects are the profile.
Freelancers publish evidence of real work — an external portfolio, a GitHub, or in-app project
write-ups — and matching is semantic in both directions rather than keyword-driven.

> Status: **Phase 2 — Foundation & Auth.** The walking skeleton is up: auth, role selection,
> onboarding and empty dashboards. See [`PROJECT.md`](./PROJECT.md) for the full plan.

## Stack

Next.js 16 (App Router) · TypeScript strict · Tailwind v4 · Supabase (Postgres, Auth, Storage,
pgvector) · Drizzle ORM · Zod · Vitest. See [ADR-001](./docs/decisions/ADR-001-stack.md).

## Running it locally

**Prerequisites:** Node 20+, Docker (for the local Supabase stack), and the
[Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
cp .env.example .env          # local defaults already work

npm run db:start              # boots Postgres + Auth + API in Docker
npm run db:migrate            # applies 9 migrations
npm run db:seed               # 126 skills, 30 profiles, 15 jobs

npm run dev                   # http://localhost:3000
```

The seeded credentials in `.env.example` are the standard local Supabase dev keys — identical
on every install and useless against a hosted project.

### Tests

```bash
npm test                      # everything (153)
npm run test:unit             # no database needed
npm run test:db               # RLS + deletion, needs a running database
```

The database suites **skip** rather than fail when no database is reachable, and both print
the host they connected to — a suite that does not say what it measured cannot prove which
database it measured.

## How the pieces fit

| Path                       | What lives there                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lib/db/schema/`           | Drizzle schema — 20 tables, 40 RLS policies. **The source of truth**; `docs/schema.md` is generated from it |
| `lib/db/migrations/`       | Generated SQL plus hand-written triggers and grants                                                         |
| `lib/schemas/`             | Zod schemas, shared by client forms and server actions                                                      |
| `lib/actions/`             | Server actions. Order is always: auth → authz → validate → act → revalidate                                 |
| `lib/seeds/skills.seed.ts` | The 126-skill taxonomy, with sources per row                                                                |
| `lib/eval/`                | Hand-labelled match evaluation set for Phase 4                                                              |

## Things worth knowing before changing anything

- **RLS is the authorization boundary**, not the middleware. `proxy.ts` is a convenience
  layer; it can be bypassed and never sees rows. Every server action re-checks ownership.
- **The publish gate is a CHECK constraint**, not just a Zod refinement. A profile needs a
  bio plus either an external site or ≥2 projects. Create as a draft, then publish.
- **`npm run db:erd`** regenerates `docs/schema.md`. Never edit it by hand.
- **Regenerating migration `0000` drops its hand-written extension preamble.** A test fails if
  that happens; put it back.

## Documentation

[`PROJECT.md`](./PROJECT.md) · [schema](./docs/schema.md) · [API surface](./docs/api.md) ·
[components](./docs/components.md) · [taxonomy](./docs/taxonomy.md) ·
[eval set](./docs/eval-set.md) · [constraints](./docs/constraints.md) ·
[ADRs](./docs/decisions/)
