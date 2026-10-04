/**
 * Seed script — Phase 1 §5.1.
 *
 * Produces the taxonomy plus ~30 talent profiles and ~15 jobs so that browse, filters and
 * (in Phase 4) matching have something real to chew on before any user exists. The cold-start
 * risk in §11 is the reason this is a Phase 1 deliverable and not an afterthought.
 *
 * Three rules this script holds to:
 *
 *  1. **Synthetic only.** No scraped profiles, no real names, no real URLs
 *     (`docs/constraints.md` §5). Every person here is generated from archetypes.
 *  2. **Deterministic.** A fixed PRNG seed, so two runs produce identical data and a matching
 *     regression is a real change rather than reshuffled fixtures.
 *  3. **Realistic in its distribution, not just its volume.** The evidence mix matters more
 *     than the count: roughly a third link only an external site, a third have only in-app
 *     items, a third have both, and a few are deliberately unpublishable. If every seeded
 *     profile were complete, the thin-profile problem (§8) would be invisible in every
 *     screenshot and every eval run — which is exactly how it got under-weighted before.
 *
 * Run: npm run db:seed    (idempotent — truncates the public tables it owns, then reinserts)
 */

import { eq, sql } from 'drizzle-orm';

import { createDbClient } from './client';
import {
  clientProfiles,
  jobSkills,
  jobs,
  portfolioItems,
  skills,
  talentProfiles,
  talentSkills,
  userProfiles,
} from './schema';
import { skillsSeed } from '../seeds/skills.seed';

// ───────────────────────── deterministic RNG ─────────────────────────
/** mulberry32 — small, fast, and seeded, so the fixture set never shuffles between runs. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260920);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const pickMany = <T>(xs: readonly T[], n: number): T[] => {
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length)
    out.push(...pool.splice(Math.floor(rand() * pool.length), 1));
  return out;
};
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

// ───────────────────────── synthetic identities ─────────────────────────
const FIRST = [
  'Amara',
  'Bruno',
  'Chiara',
  'Dev',
  'Elif',
  'Farid',
  'Greta',
  'Hugo',
  'Ines',
  'Jonas',
  'Kaia',
  'Luca',
  'Mira',
  'Nils',
  'Oona',
  'Pablo',
  'Quinn',
  'Rafa',
  'Sana',
  'Tomas',
  'Ulla',
  'Viktor',
  'Wren',
  'Xime',
  'Yusuf',
  'Zora',
  'Ada',
  'Bo',
  'Cato',
  'Dagny',
];
const LAST = [
  'Alder',
  'Brandt',
  'Costa',
  'Duval',
  'Eriksen',
  'Ferrer',
  'Grimm',
  'Haas',
  'Ibori',
  'Janos',
  'Keller',
  'Lindqvist',
  'Moretti',
  'Novak',
  'Okafor',
  'Pryce',
  'Quental',
  'Rossi',
  'Soto',
  'Tamm',
  'Ueda',
  'Vance',
  'Wyatt',
  'Ximenes',
  'Yilmaz',
  'Zegers',
  'Bauer',
  'Cortes',
  'Dahl',
  'Engel',
];

/**
 * Archetypes mirror the evaluation set (docs/eval-set.md) so that seeded data exercises the
 * same shapes Phase 4 is graded on — including the near-miss profiles.
 */
const ARCHETYPES = [
  {
    key: 'payments',
    headline: 'Payments & serverless full-stack developer',
    bio: 'I build checkout and billing flows that survive contact with production: signed webhooks, idempotent replay, and reconciliation you can audit. Mostly Next.js on Vercel with Postgres behind it.',
    skills: ['typescript', 'nextjs', 'payment-integration', 'serverless', 'webhooks', 'postgresql'],
    items: [
      [
        'Subscription checkout rebuild',
        'Replaced a hand-rolled checkout with Stripe Checkout + webhook reconciliation. Failed payments fell from 4.1% to 0.6% over two months.',
      ],
      [
        'Webhook retry worker',
        'Queue-backed retry with exponential backoff and a dead-letter table. Cleared a backlog of ~12k unprocessed events.',
      ],
    ],
    rate: [65, 110] as const,
  },
  {
    key: 'automation',
    headline: 'Automation & systems integration engineer',
    bio: 'CRM-to-billing plumbing. I wire HubSpot, Zoho and Stripe together with n8n or custom workers — OAuth apps, scheduled reconciliation, dead-letter handling, and alerting that names the failing record.',
    skills: ['n8n', 'zapier', 'hubspot', 'oauth', 'etl', 'cron', 'rest-api-integration'],
    items: [
      [
        'Two-way CRM ↔ billing sync',
        'Bidirectional contact and invoice sync with conflict rules. Cut a 6-hour weekly manual reconciliation to zero.',
      ],
      [
        'Order routing automation',
        'Rules engine over incoming orders with a human-approval step for exceptions.',
      ],
    ],
    rate: [55, 95] as const,
  },
  {
    key: 'ai',
    headline: 'AI application developer — RAG & agents',
    bio: 'Retrieval systems that can be evaluated rather than demoed. pgvector on Supabase, LLM APIs, retrieval tuning, and an eval harness so improvements are provable. I care about refusal behaviour as much as recall.',
    skills: [
      'rag',
      'vector-search',
      'supabase',
      'llm-integration',
      'prompt-engineering',
      'llm-evals',
      'chatbots',
    ],
    items: [
      [
        'Documentation assistant',
        'RAG over 4k support articles with a 120-case eval set. Answer accuracy 71% → 89% after chunking and reranking changes.',
      ],
      [
        'Support bot with guardrails',
        'Refusal and escalation rules so the bot declines policy questions instead of inventing answers.',
      ],
    ],
    rate: [80, 140] as const,
  },
  {
    key: 'php',
    headline: 'Laravel & infrastructure generalist',
    bio: 'I take over neglected applications. Containerise them, add CI, harden the server, and fix the queries that are actually slow rather than the ones that look slow.',
    skills: [
      'laravel',
      'php',
      'mysql',
      'docker',
      'github-actions',
      'linux-admin',
      'database-design',
    ],
    items: [
      [
        'Legacy monolith → Docker',
        'Containerised a 9-year-old Laravel app, added CI, and cut deploys from 40 minutes of manual steps to 6 minutes.',
      ],
      [
        'Reporting query rescue',
        'Index and query rewrite work that took a nightly report from 38 minutes to 90 seconds.',
      ],
    ],
    rate: [50, 85] as const,
  },
  {
    key: 'ecommerce',
    headline: 'E-commerce developer — WooCommerce & Shopify',
    bio: 'Storefronts that load fast and rank. WooCommerce and Shopify builds, payment and shipping integrations, and the performance work that makes the difference on mobile.',
    skills: [
      'woocommerce',
      'wordpress',
      'shopify',
      'payment-integration',
      'performance',
      'developer-seo',
    ],
    items: [
      [
        'Homewares storefront',
        'WooCommerce build with Stripe and PayPal. Mobile LCP 4.8s → 1.9s; organic sessions up 34% in a quarter.',
      ],
      [
        'Headless Shopify migration',
        'Moved a themed store to a headless storefront without losing its existing URLs or rankings.',
      ],
    ],
    rate: [45, 80] as const,
  },
  {
    key: 'frontend',
    headline: 'Frontend engineer — React & design systems',
    bio: 'Interfaces and component systems in React and Next.js. Accessibility is part of the build, not a later audit: keyboard paths and focus states get written with the component.',
    skills: [
      'react',
      'nextjs',
      'typescript',
      'tailwind',
      'accessibility',
      'web-ux-build',
      'testing',
    ],
    items: [
      [
        'Design system in Storybook',
        '40-component library with keyboard and screen-reader coverage, adopted by three product teams.',
      ],
      ['Marketing site rebuild', 'Static-first rebuild. Lighthouse performance 62 → 98 on mobile.'],
    ],
    rate: [55, 100] as const,
  },
  {
    key: 'devops',
    headline: 'DevOps & platform engineer',
    bio: 'Containers, pipelines and infrastructure as code. I make deploys boring: Docker, Kubernetes where it earns its keep, Terraform, and monitoring that pages on symptoms rather than noise.',
    skills: [
      'docker',
      'kubernetes',
      'terraform',
      'github-actions',
      'linux-admin',
      'observability',
      'aws',
    ],
    items: [
      [
        'Kubernetes migration',
        'Moved 11 services off bare VMs. Deploy frequency went from weekly to on-demand.',
      ],
      [
        'Terraform module library',
        'Reusable modules for networking and IAM, removing hand-clicked infrastructure.',
      ],
    ],
    rate: [70, 120] as const,
  },
  {
    key: 'mobile',
    headline: 'Mobile developer — React Native & Expo',
    bio: 'Cross-platform apps from first commit to store listing. React Native with Expo, offline-first data, and the release plumbing most quotes forget to include.',
    skills: ['react-native', 'typescript', 'firebase', 'ios', 'android', 'rest-api-integration'],
    items: [
      [
        'Field-service app',
        'Offline-first job sheets with conflict resolution on reconnect. Used daily by ~200 engineers.',
      ],
      [
        'Store release pipeline',
        'Automated builds and submissions for both stores, cutting release overhead to one command.',
      ],
    ],
    rate: [60, 105] as const,
  },
] as const;

const COMPANIES = [
  ['Northwind Logistics', 'Logistics'],
  ['Braid Health', 'Healthcare'],
  ['Tallow & Co', 'Retail'],
  ['Kestrel Analytics', 'Data & analytics'],
  ['Marlow Studio', 'Design agency'],
  ['Halden Fintech', 'Financial services'],
  ['Pergola Labs', 'SaaS'],
  ['Ferrous Manufacturing', 'Manufacturing'],
  ['Wavelet Media', 'Media'],
  ['Orchard Education', 'Education'],
  ['Solaris Energy', 'Energy'],
  ['Cobalt Legal', 'Legal services'],
] as const;

/** Job templates. The first five mirror the evaluation briefs so seeded data matches the eval. */
const JOB_TEMPLATES = [
  {
    title: 'Stripe + serverless payments integration',
    description:
      'Our Next.js storefront needs Stripe Checkout and reliable webhook handling on Vercel serverless functions. Idempotency and retry behaviour matter more to us than UI polish — we have been burned by duplicate charges before.',
    skills: ['payment-integration', 'nextjs', 'serverless', 'webhooks', 'typescript'],
    engagement: 'fixed' as const,
    budget: [2000, 4000] as const,
  },
  {
    title: 'HubSpot ↔ Stripe operations sync',
    description:
      'Keep HubSpot contacts and Stripe invoices in sync in both directions using n8n or Zapier. Needs OAuth app setup, scheduled reconciliation, retry on failure, and alerting that tells us which record broke.',
    skills: ['n8n', 'zapier', 'hubspot', 'oauth', 'cron', 'etl'],
    engagement: 'fixed' as const,
    budget: [1500, 3000] as const,
  },
  {
    title: 'RAG support chatbot over our documentation',
    description:
      'Retrieval-augmented chatbot on Supabase and pgvector answering from our docs. We need an eval harness and guardrails — a previous attempt confidently invented our refund policy.',
    skills: ['rag', 'vector-search', 'supabase', 'llm-integration', 'llm-evals', 'chatbots'],
    engagement: 'fixed' as const,
    budget: [4000, 7000] as const,
  },
  {
    title: 'Laravel + MySQL app: containerise and tune',
    description:
      'We inherited a Laravel 9 application running on a bare VPS. We want it on Docker with CI, and the slow queries on the reporting page fixed.',
    skills: ['laravel', 'php', 'mysql', 'docker', 'github-actions', 'database-design'],
    engagement: 'hourly' as const,
    budget: [50, 80] as const,
  },
  {
    title: 'WooCommerce store build',
    description:
      'WordPress and WooCommerce store for a small homewares brand. Stripe and PayPal checkout, fast on mobile, and product pages that actually rank.',
    skills: ['woocommerce', 'wordpress', 'payment-integration', 'performance', 'developer-seo'],
    engagement: 'fixed' as const,
    budget: [2000, 5000] as const,
  },
  {
    title: 'Internal admin panel over our Postgres',
    description:
      'Operations team needs a usable admin interface over existing Postgres data: search, bulk edits, role-based access. Retool is fine, or a small custom app — we care about the workflow, not the tool.',
    skills: ['retool', 'postgresql', 'react', 'database-design'],
    engagement: 'fixed' as const,
    budget: [3000, 6000] as const,
  },
  {
    title: 'Shopify app for subscription boxes',
    description:
      'Private Shopify app managing subscription boxes: skip, swap and pause, with a customer portal. Liquid plus an embedded admin surface.',
    skills: ['shopify', 'payment-integration', 'javascript', 'rest-api-integration'],
    engagement: 'fixed' as const,
    budget: [5000, 9000] as const,
  },
  {
    title: 'React Native app — MVP build',
    description:
      'Cross-platform MVP for a field-service product. Offline-first job sheets, photo capture, sync on reconnect, and both store submissions.',
    skills: ['react-native', 'typescript', 'firebase', 'ios', 'android'],
    engagement: 'fixed' as const,
    budget: [8000, 15000] as const,
  },
  {
    title: 'Kubernetes migration and CI overhaul',
    description:
      'Move eleven services off hand-managed VMs onto Kubernetes, with Terraform for the infrastructure and GitHub Actions for delivery. Monitoring and alerting included.',
    skills: ['kubernetes', 'terraform', 'docker', 'github-actions', 'observability', 'aws'],
    engagement: 'hourly' as const,
    budget: [75, 120] as const,
  },
  {
    title: 'Accessibility audit and remediation',
    description:
      'WCAG 2.2 AA audit of our customer portal and the fixes to go with it. Keyboard paths, focus management and screen-reader behaviour, with a report we can show a client.',
    skills: ['accessibility', 'react', 'html-css', 'testing'],
    engagement: 'fixed' as const,
    budget: [3500, 6000] as const,
  },
  {
    title: 'Data pipeline: Airtable → warehouse',
    description:
      'Nightly ETL from Airtable and a handful of SaaS APIs into BigQuery, with schema drift handling and a failure alert that is actually actionable.',
    skills: ['etl', 'bigquery', 'python', 'airtable', 'cron'],
    engagement: 'fixed' as const,
    budget: [4000, 8000] as const,
  },
  {
    title: 'Invoice OCR and document extraction',
    description:
      'Extract structured line items from supplier invoices (PDF and scanned) into our accounting system. Needs a confidence threshold and a human review queue for anything uncertain.',
    skills: ['computer-vision', 'python', 'llm-integration', 'rest-api-integration'],
    engagement: 'fixed' as const,
    budget: [5000, 10000] as const,
  },
  {
    title: 'Performance rescue on a Next.js site',
    description:
      'Our marketing site fails Core Web Vitals on mobile and it is hurting acquisition. We want measurements first, then the fixes that move them.',
    skills: ['performance', 'nextjs', 'react', 'developer-seo'],
    engagement: 'fixed' as const,
    budget: [2500, 4500] as const,
  },
  {
    title: 'Google Workspace automation for onboarding',
    description:
      'Automate employee onboarding across Google Workspace: account creation, drive permissions, calendar invites, and a checklist that chases the stragglers.',
    skills: ['google-apps-script', 'oauth', 'rest-api-integration', 'cron'],
    engagement: 'fixed' as const,
    budget: [1200, 2500] as const,
  },
  {
    title: 'Odoo customisation for inventory',
    description:
      'Customise Odoo inventory for a two-warehouse operation: custom fields, transfer rules, and a barcode-friendly picking view. Python module work, not configuration alone.',
    skills: ['odoo', 'python', 'postgresql', 'docker'],
    engagement: 'hourly' as const,
    budget: [55, 90] as const,
  },
] as const;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

async function main() {
  const { db, sql: pg } = createDbClient();
  console.log('Seeding…');

  // Wipe only what this script owns, then remove the synthetic auth users it created last
  // run. talent_profiles.user_id and client_profiles.user_id are FKs into auth.users, so
  // seeded profiles need real auth rows — a random uuid would violate the constraint.
  // Seeded users are tagged in raw_app_meta_data so this never touches a real account.
  await db.execute(sql`
    truncate table job_skills, jobs, client_profiles, item_media, portfolio_items,
                   talent_skills, talent_profiles, skills restart identity cascade`);
  await db.execute(
    // Matches the old tag too: renaming the project must not orphan users seeded under it.
    sql`delete from auth.users where raw_app_meta_data->>'seed' in ('techselect', 'niche-job-board')`,
  );

  /** Creates a synthetic auth user and its user_profiles row, returning the id. */
  async function makeUser(displayName: string, handle: string): Promise<string> {
    // Only base-schema columns. GoTrue adds columns (email_confirmed_at, etc.) through its
    // own migrations, and this script must not care how far those have run — it seeds data
    // for browse and matching, not logins.
    //
    // The token columns are written as '' rather than left NULL, which looks like pedantry
    // and is not. GoTrue is Go: it scans those columns into a plain `string`, and a NULL
    // makes the whole request fail with
    //
    //   unable to fetch records: sql: Scan error on column index 3, name "confirmation_token":
    //   converting NULL to string is unsupported
    //
    // That is a 500 on GET /admin/users for ANY page containing a seeded row — so the admin
    // user list breaks as soon as the seed runs, from data this script wrote.
    const [row] = await db.execute<{ id: string }>(sql`
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                              created_at, updated_at, raw_app_meta_data,
                              confirmation_token, recovery_token, email_change,
                              email_change_token_new, email_change_token_current,
                              phone_change, phone_change_token, reauthentication_token)
      values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated',
              'authenticated', ${`${handle}@example.test`}, 'seed-not-a-real-password',
              now(), now(), '{"seed":"techselect"}'::jsonb,
              '', '', '', '', '', '', '', '')
      returning id`);
    const id = row!.id;
    await db.insert(userProfiles).values({ userId: id, displayName });
    return id;
  }

  // ── taxonomy ──
  const inserted = await db
    .insert(skills)
    .values(
      skillsSeed.map((s) => ({
        name: s.name,
        slug: s.slug,
        category: s.category,
        aliases: s.aliases,
        isApproved: true,
      })),
    )
    .returning({ id: skills.id, slug: skills.slug });
  const skillId = new Map(inserted.map((s) => [s.slug, s.id]));
  console.log(`  ${inserted.length} skills`);

  // ── talent ──
  // The evidence mix is the point. Four buckets, in this proportion:
  //   both (10) · items only (9) · site only (8) · neither, unpublished (3)
  const MIX = [
    ...Array<'both'>(10).fill('both'),
    ...Array<'items'>(9).fill('items'),
    ...Array<'site'>(8).fill('site'),
    ...Array<'neither'>(3).fill('neither'),
  ];

  let talentCount = 0;
  let itemCount = 0;
  for (let i = 0; i < MIX.length; i++) {
    const mix = MIX[i]!;
    const arch = ARCHETYPES[i % ARCHETYPES.length]!;
    const first = FIRST[i % FIRST.length]!;
    const last = LAST[(i * 7) % LAST.length]!;
    const name = `${first} ${last}`;
    const handle = slugify(`${first}-${last}-${i}`);

    const hasSite = mix === 'both' || mix === 'site';
    const hasItems = mix === 'both' || mix === 'items';
    // Unpublishable by design: no evidence at all. Exercises the publish gate and the
    // "profile renders in all four states" requirement (§7).
    const published = mix !== 'neither';

    const [min] = [int(arch.rate[0], arch.rate[0] + 10)];
    const max = int(arch.rate[1] - 10, arch.rate[1]);

    const userId = await makeUser(name, handle);
    const [profile] = await db
      .insert(talentProfiles)
      .values({
        userId,
        slug: handle,
        headline: arch.headline,
        bio: mix === 'neither' ? '' : arch.bio,
        hourlyRateMin: String(min),
        hourlyRateMax: String(max),
        currency: pick(['USD', 'EUR', 'GBP', 'CHF']),
        availability: pick(['full_time', 'part_time', 'occasional'] as const),
        yearsExperience: int(2, 14),
        timezone: pick([
          'Europe/Zurich',
          'Europe/London',
          'Europe/Berlin',
          'America/New_York',
          'Asia/Manila',
        ]),
        websiteUrl: hasSite ? `https://example.test/${handle}` : null,
        // Seeded as connected accounts (migration 0021): the public profile shows only those.
        // The seed runs as the owner role, which the guard trigger lets through.
        ...(rand() > 0.35
          ? { githubUrl: `https://github.test/${handle}`, githubConnectedAt: new Date() }
          : {}),
        ...(rand() > 0.6
          ? { linkedinUrl: `https://linkedin.test/in/${handle}`, linkedinConnectedAt: new Date() }
          : {}),
        acceptsMessages: rand() > 0.12, // a few opt out — ADR-007 D1
        // Always inserted as a DRAFT, then published at the end once its evidence exists.
        // The publish gate is a CHECK evaluated on every write, so a profile whose evidence
        // is in-app items cannot be created already-published — portfolio_item_count is still
        // 0 at that moment. That is the real onboarding order (flows §2: add items, then
        // publish), and the database refusing the shortcut is the constraint working.
        isPublished: false,
      })
      .returning({ id: talentProfiles.id });

    const ids = arch.skills.map((s) => skillId.get(s)).filter((x): x is string => Boolean(x));
    if (ids.length) {
      await db.insert(talentSkills).values(
        ids.map((id) => ({
          talentId: profile!.id,
          skillId: id,
          proficiency: pick(['familiar', 'proficient', 'expert'] as const),
          years: int(1, 10),
        })),
      );
    }

    if (hasItems) {
      const n = int(2, 3);
      for (let k = 0; k < n; k++) {
        const [title, outcome] = arch.items[k % arch.items.length]!;
        await db.insert(portfolioItems).values({
          talentId: profile!.id,
          title:
            n > arch.items.length && k >= arch.items.length
              ? `${title} (second engagement)`
              : title,
          description: outcome,
          role: pick([
            'Sole developer',
            'Tech lead',
            'Contract developer',
            'Part of a team of three',
          ]),
          outcome,
          techStack: pickMany([...arch.skills], Math.min(4, arch.skills.length)),
          links: [
            ...(rand() > 0.45 ? [`https://github.test/${handle}/project-${k + 1}`] : []),
            ...(rand() > 0.5 ? [`https://example.test/${handle}/work/${k + 1}`] : []),
          ],
          sortOrder: k,
        });
        itemCount++;
      }
    }

    // Now that evidence exists, publish. This is the same two-step the UI performs.
    if (published) {
      await db
        .update(talentProfiles)
        .set({ isPublished: true })
        .where(eq(talentProfiles.id, profile!.id));
    }
    talentCount++;
  }
  console.log(`  ${talentCount} talent profiles (${itemCount} portfolio items)`);

  // ── clients and jobs ──
  const clientIds: string[] = [];
  for (const [company, industry] of COMPANIES) {
    const [c] = await db
      .insert(clientProfiles)
      .values({
        userId: await makeUser(company, slugify(company)),
        companyName: company,
        industry,
        website: `https://example.test/${slugify(company)}`,
        about: `${company} is a ${industry.toLowerCase()} business hiring independent developers for scoped projects.`,
      })
      .returning({ id: clientProfiles.id });
    clientIds.push(c!.id);
  }

  let jobCount = 0;
  for (let i = 0; i < JOB_TEMPLATES.length; i++) {
    const tpl = JOB_TEMPLATES[i]!;
    // Two drafts, so draft-visibility RLS has something to hide in the seeded set.
    const status = i >= JOB_TEMPLATES.length - 2 ? ('draft' as const) : ('open' as const);
    const locationType = pick(['remote', 'remote', 'remote', 'hybrid'] as const);
    const [job] = await db
      .insert(jobs)
      .values({
        clientId: clientIds[i % clientIds.length]!,
        title: tpl.title,
        slug: `${slugify(tpl.title)}-${i}`,
        description: tpl.description,
        requirements: `Required: ${tpl.skills.slice(0, 3).join(', ')}. Please include examples of comparable work.`,
        engagementType: tpl.engagement,
        budgetMin: String(tpl.budget[0]),
        budgetMax: String(tpl.budget[1]),
        currency: pick(['USD', 'EUR', 'GBP', 'CHF']),
        locationType,
        location: locationType === 'remote' ? null : pick(['Zurich', 'London', 'Berlin', 'Lisbon']),
        experienceLevel: pick(['mid', 'senior', 'senior', 'lead'] as const),
        status,
        deadline: new Date(Date.now() + int(14, 90) * 86_400_000),
        publishedAt: status === 'open' ? new Date(Date.now() - int(1, 40) * 86_400_000) : null,
      })
      .returning({ id: jobs.id });

    const ids = tpl.skills.map((s) => skillId.get(s)).filter((x): x is string => Boolean(x));
    if (ids.length) {
      await db
        .insert(jobSkills)
        .values(ids.map((id, k) => ({ jobId: job!.id, skillId: id, isRequired: k < 3 })));
    }
    jobCount++;
  }
  console.log(`  ${clientIds.length} clients, ${jobCount} jobs (2 drafts)`);

  // The evidence distribution is the number worth printing: if it ever collapses to
  // "everyone is complete", the thin-profile case stops being visible in the product.
  const [dist] = await db.execute<{
    site_only: number;
    items_only: number;
    both: number;
    neither: number;
  }>(sql`
    select
      count(*) filter (where website_url is not null and portfolio_item_count = 0) as site_only,
      count(*) filter (where website_url is null and portfolio_item_count > 0) as items_only,
      count(*) filter (where website_url is not null and portfolio_item_count > 0) as both,
      count(*) filter (where website_url is null and portfolio_item_count = 0) as neither
    from talent_profiles`);
  console.log('  evidence mix:', dist);

  await pg.end();
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
