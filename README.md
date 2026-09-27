# TechSelect

A job board for **software, web and automation work**. Anyone can list — show a portfolio if you have one — and clients decide who to hire.
Freelancers publish evidence of real work — an external portfolio, a GitHub, or in-app project
write-ups — and matching is semantic in both directions rather than keyword-driven.

> Status: **Phase 5 — Audit, deploy & document.** The product is complete and deployed:
> auth and onboarding, profiles and portfolios, job posting and applications, messaging,
> and semantic matching in both directions. See [`PROJECT.md`](./PROJECT.md) for the plan and
> what remains.

## Screenshots

Regenerate with `CAPTURE_SCREENSHOTS=1 npx playwright test e2e/screenshots.spec.ts`, which
captures them from the real app against seeded data — so they cannot quietly stop matching what
ships.

| | |
| --- | --- |
| ![Landing page](./docs/screenshots/01-landing.png) | ![Browsing jobs](./docs/screenshots/02-browse-jobs.png) |
| Asks which side you are on before asking for an account | Search and filters, no AI required |
| ![Browsing developers](./docs/screenshots/03-browse-talent.png) | ![A public profile](./docs/screenshots/04-talent-profile.png) |
| Everyone who wants to be listed is listed | Evidence of real work, judged by the client |
| ![Developer dashboard](./docs/screenshots/05-dashboard.png) | |
| The empty state is the honest one — nothing is padded | |

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
npm run db:migrate            # applies 19 migrations
npm run db:seed               # 126 skills, 30 profiles, 15 jobs

npm run dev                   # http://localhost:3000
```

The seeded credentials in `.env.example` are the standard local Supabase dev keys — identical
on every install and useless against a hosted project.

### Environment variables

`.env` is a commented checklist of all of these. Nothing below is needed to run the app
locally: without them the features they power degrade to an honest empty state rather than
breaking, which is deliberate and is why `/api/health` reports what is configured.

| Variable | Needed for | Absent means |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | everything | the app will not boot |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | everything | the app will not boot |
| `SUPABASE_SERVICE_ROLE_KEY` | email, matching, cache warming | no email is sent; no ranking is written |
| `DATABASE_URL` | migrations, seeding, tests, CLI scripts | **never set this in Vercel** — no runtime code reads it |
| `GEMINI_API_KEY` | embeddings and re-ranking | match feeds show "no strong matches yet" |
| `RESEND_API_KEY` | transactional email | mail is skipped and logged |
| `EMAIL_FROM` | a verified sending domain | the shared sender, which only reaches the Resend account owner |
| `MATCH_WARM_SECRET` | the manual warm endpoint | that one route returns 503 |
| `SUPABASE_AUTH_EXTERNAL_*` | Google/GitHub sign-in **locally** | OAuth buttons fail locally; hosted reads its own dashboard |

Check any deploy with `/api/health`: it reports which of these are set, whether the
service-role key actually *works* — those are different questions, and the gap between them
once hid a fortnight of silently failed email — and today's AI spend against its cap.

### Background jobs

Two GitHub Actions, both free-tier friendly:

- **`keep-alive`** every 3 days, so the Supabase project never pauses. It hits `/api/health`,
  which runs a real query — pinging the homepage would not count.
- **`warm-matches`** hourly, which backfills missing embeddings and precomputes rankings.
  It runs in Actions rather than on Vercel because a single re-rank was measured at 238s and
  a serverless function is capped at 300s.

### Tests

```bash
npm test                      # everything (477 unit + database)
npm run test:unit             # no database needed
npm run test:db               # RLS + deletion, needs a running database
```

The database suites **skip** rather than fail when no database is reachable, and both print
the host they connected to — a suite that does not say what it measured cannot prove which
database it measured.

## How the pieces fit

| Path                       | What lives there                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lib/db/schema/`           | Drizzle schema — 20 tables, 42 RLS policies. **The source of truth**; `docs/schema.md` is generated from it |
| `lib/db/migrations/`       | Generated SQL plus hand-written triggers and grants                                                         |
| `lib/schemas/`             | Zod schemas, shared by client forms and server actions                                                      |
| `lib/actions/`             | Server actions. Order is always: auth → authz → validate → act → revalidate                                 |
| `lib/seeds/skills.seed.ts` | The 126-skill taxonomy, with sources per row                                                                |
| `lib/eval/`                | Hand-labelled match evaluation set, plus the scoring CLI (`npm run eval`)                                   |
| `lib/matching/`            | The matching pipeline: text, embeddings, retrieval, re-ranking, cache, budget                               |

## Things worth knowing before changing anything

- **RLS is the authorization boundary**, not the middleware. `proxy.ts` is a convenience
  layer; it can be bypassed and never sees rows. Every server action re-checks ownership.
- **There is no publish gate.** There used to be — a CHECK constraint requiring a bio plus
  either an external site or ≥2 projects — and [ADR-008](./docs/decisions/ADR-008-no-publish-gate.md)
  removed it. Anyone may publish with nothing but a headline. Thin profiles rank badly rather
  than being refused a hearing, and `lib/services/profile-editing.test.ts` asserts the
  constraint is *absent* so it cannot return by accident.
- **Matching never computes in a request.** Rankings are precomputed into `match_cache` by an
  hourly job, because re-ranking takes 30–240s on Gemini's free tier. A page that has no
  cached ranking says so; it does not wait.
- **`npm run db:erd`** regenerates `docs/schema.md`. Never edit it by hand.
- **Regenerating migration `0000` drops its hand-written extension preamble.** A test fails if
  that happens; put it back.

## Documentation

[`PROJECT.md`](./PROJECT.md) · [architecture](./docs/architecture.md) ·
[matching](./docs/matching.md) · [deploying](./docs/deploy.md) ·
[schema](./docs/schema.md) · [API surface](./docs/api.md) ·
[components](./docs/components.md) · [taxonomy](./docs/taxonomy.md) ·
[eval set](./docs/eval-set.md) · [constraints](./docs/constraints.md) ·
[ADRs](./docs/decisions/) · [contributing](./CONTRIBUTING.md)
