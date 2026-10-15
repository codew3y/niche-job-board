# TechSelect — Job Board for Software, Web and Automation Work

A job board where freelance developers show the work they have shipped and clients find the
right person for a brief. Matching is semantic in both directions: each match comes with a
one-sentence reason, and clients see an order and a reason, never a score on a person. Live at
[techselect.vercel.app](https://techselect.vercel.app).

**This is not open-source software.** The source is visible for review; no licence is granted to
use, copy, modify or distribute it. All rights reserved.

## Tech stack

- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) + Tailwind CSS 4
- Supabase: Postgres with Row Level Security, Auth (email, Google, GitHub), Storage, pgvector
- Drizzle ORM + drizzle-kit migrations; Zod validation shared by forms and server actions
- Matching: Google Gemini embeddings and re-ranking, precomputed into a cache by a scheduled job
- Email: Resend; error tracking: Sentry; hosting: Vercel; CI and scheduled jobs: GitHub Actions
- Tests: Vitest (unit and database) and Playwright (end-to-end and accessibility, axe)

## Repository layout

npm-workspaces monorepo. Run every command from the repo root; the root `.env` is shared by both
workspaces (the app, drizzle-kit, Vitest and Playwright all read it from the root).

```
backend/                 @techselect/backend — server logic, no UI
  src/db/                Drizzle schema, migrations, seed, RLS and database tests
  src/services/          data access for jobs, profiles, applications, messaging…
  src/matching/          embeddings, retrieval, re-ranking, cache, AI budget
  src/schemas/           Zod validation
  src/supabase/          server clients, session, route policy
  src/email/ src/import/ email, resume import
  src/eval/ src/seeds/   match evaluation set, skill taxonomy
frontend/                @techselect/frontend — the Next.js app
  app/                   pages and route handlers (/api/health, /api/match/warm, auth callbacks)
  components/            UI
  lib/actions/           server actions (every mutation the UI performs)
  public/  e2e/          static assets, Playwright tests
supabase/                Supabase CLI config for the local stack
docs/                    API, operations, privacy, user guide
```

The frontend imports server code as `@techselect/backend/<module>`, resolved straight from
`backend/src` (no build step). Server actions and route handlers stay in `frontend/` because
Next.js serves them.

## Quickstart

Needs Node 22+, Docker and the [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
# 1. Install the workspaces
npm install

# 2. Env + local database (Postgres, Auth and Storage in Docker)
cp .env.example .env
npm run db:start
npm run db:migrate
npm run db:seed            # skills taxonomy plus sample profiles and jobs

# 3. Dev server
npm run dev                # http://localhost:3000

# 4. Verify
npm run typecheck && npm run lint && npm test
```

The local Supabase stack prints its anon and service-role keys on `npm run db:start`; put them
in `.env`. Every other integration is optional: without it, the feature it powers degrades to an
honest empty state instead of breaking. See `.env.example`.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js lifecycle for `frontend/` |
| `npm run typecheck` / `lint` | `tsc --noEmit` in both workspaces / ESLint |
| `npm test` / `npm run test:unit` / `npm run test:db` | all unit tests / no database needed / RLS and deletion against a database |
| `npm run test:e2e` | Playwright end-to-end and accessibility tests (`frontend/e2e`) |
| `npm run db:start` / `db:stop` | local Supabase stack |
| `npm run db:migrate` / `db:status` / `db:seed` | apply migrations / show pending ones and the target host / seed |
| `npm run db:erd` | generate a local schema reference (`backend/.generated/`, not committed) |
| `npm run embed:backfill` / `match:warm` | backfill embeddings / precompute match rankings |
| `npm run eval` | score the matcher against the hand-labelled evaluation set |

## Project docs (`docs/`)

- `USER-GUIDE.md` — how developers and clients use the board
- `PRIVACY.md` — data collected, processors, retention, rights

## Deploy notes

- Push to `main` → GitHub Actions CI (typecheck, lint, unit, build, end-to-end) → Vercel deploys.
- The Vercel project's **Root Directory** is `frontend` (Settings → Build and Deployment), with
  "Include files outside the root directory" enabled; Vercel installs the workspaces from the
  repo root.
- Migrations are **not** automated: apply a migration to the hosted database first, then merge
  the code that needs it.
- Secrets live in Vercel and in GitHub Actions secrets, never in the repository.
