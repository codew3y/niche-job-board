// Hand-labelled match evaluation set — Phase 0 deliverable per PROJECT.md §4.2 / §4.5 / §8.
//
// Machine-readable on purpose. The previous version lived only in Markdown, which let two
// problems hide: the skill names drifted from the taxonomy's canonical names, and the gate
// ("precision@5 >= 0.8") was arithmetically impossible on the set it was measuring. Keeping
// the labels in code means `match-eval-set.test.ts` can check both.
//
// Grading: 2 = strong match (I would put this candidate in front of the client)
//          1 = plausible (adjacent skills, missing the depth the brief actually needs)
//          0 = no match
//
// Every skill slug below must exist in lib/seeds/skills.seed.ts — enforced by test.
// See docs/eval-set.md for the reasoning behind each label.

export type Grade = 0 | 1 | 2;

export type EvalJob = {
  id: string;
  title: string;
  brief: string;
  skills: string[]; // canonical slugs
  budget: string;
  engagement: 'fixed' | 'hourly' | 'retainer';
};

export type EvalProfile = {
  id: string;
  name: string;
  bio: string;
  skills: string[]; // canonical slugs
  /** In-app portfolio items. An empty array is the thin-profile case. */
  items: string[];
  websiteUrl: string | null;
  /** Marks a profile that exists to be a near-miss for a specific job. */
  distractorFor?: string;
};

export const evalJobs: EvalJob[] = [
  {
    id: 'J1',
    title: 'Stripe + serverless payments integration',
    brief:
      'Next.js storefront needs Stripe Checkout plus reliable webhook handling on Vercel ' +
      'serverless functions. Idempotency and retry behaviour matter more than UI polish.',
    skills: ['payment-integration', 'nextjs', 'serverless', 'webhooks', 'typescript', 'vercel'],
    budget: '$2,000–4,000',
    engagement: 'fixed',
  },
  {
    id: 'J2',
    title: 'HubSpot ↔ Stripe operations sync',
    brief:
      'Keep HubSpot contacts and Stripe invoices in sync both ways using n8n or Zapier. ' +
      'OAuth app setup, scheduled reconciliation, retry on failure, error alerting.',
    skills: ['n8n', 'zapier', 'hubspot', 'payment-integration', 'oauth', 'cron', 'etl'],
    budget: '$1,500–3,000',
    engagement: 'fixed',
  },
  {
    id: 'J3',
    title: 'RAG support chatbot over product docs',
    brief:
      'Retrieval-augmented chatbot on Supabase + pgvector answering from our documentation. ' +
      'Needs an eval harness and guardrails — we have been burned by a bot that confidently ' +
      'invented refund policy.',
    skills: ['rag', 'vector-search', 'supabase', 'llm-integration', 'chatbots', 'llm-evals'],
    budget: '$4,000–7,000',
    engagement: 'fixed',
  },
  {
    id: 'J4',
    title: 'Laravel + MySQL app: containerise and tune',
    brief:
      'Inherited Laravel 9 app on a bare VPS. Move it to Docker, add CI, and fix the slow ' +
      'queries that time out on the reporting page.',
    skills: ['laravel', 'php', 'mysql', 'docker', 'github-actions', 'linux-admin', 'database-design'],
    budget: '$50–80/hr',
    engagement: 'hourly',
  },
  {
    id: 'J5',
    title: 'WooCommerce store build',
    brief:
      'WordPress/WooCommerce store for a small homewares brand. Stripe and PayPal checkout, ' +
      'fast on mobile, product pages that rank.',
    skills: ['woocommerce', 'wordpress', 'payment-integration', 'performance', 'developer-seo'],
    budget: '$2,000–5,000',
    engagement: 'fixed',
  },
];

export const evalProfiles: EvalProfile[] = [
  {
    id: 'P1',
    name: 'Maya — payments-on-serverless full-stack',
    bio:
      'Three production Stripe integrations on Next.js/Vercel, all with signed webhook ' +
      'handling and idempotent replay. Node/TypeScript, Postgres. I also run n8n automations ' +
      'for ops teams.',
    skills: ['typescript', 'nextjs', 'payment-integration', 'serverless', 'webhooks', 'postgresql'],
    items: ['SaaS checkout rebuild (repo + live + outcome)', 'Webhook retry worker (outcome)'],
    websiteUrl: 'https://example.com/maya',
  },
  {
    id: 'P2',
    name: 'Omar — ops automation engineer',
    bio:
      'I build CRM↔billing syncs. HubSpot, Zoho and Stripe wired through n8n and Zapier, with ' +
      'OAuth apps, scheduled reconciliation and dead-letter handling.',
    skills: ['n8n', 'zapier', 'hubspot', 'oauth', 'etl', 'cron'],
    items: ['HubSpot↔Stripe two-way sync', 'Zoho Deluge invoicing flow'],
    websiteUrl: null,
  },
  {
    id: 'P3',
    name: 'Priya — AI application developer',
    bio:
      'RAG chatbots end to end: pgvector on Supabase, LLM APIs, retrieval tuning, and an eval ' +
      'harness so we can prove the answers got better rather than guess.',
    skills: ['rag', 'vector-search', 'supabase', 'llm-integration', 'prompt-engineering', 'llm-evals'],
    items: ['Docs chatbot with published eval scores', 'Support bot with refusal guardrails'],
    websiteUrl: null,
  },
  {
    id: 'P4',
    name: 'Tomas — PHP and infrastructure generalist',
    bio:
      'Laravel and MySQL on Docker. I take over neglected apps: containerise them, add CI, ' +
      'harden the box, and fix the queries that are actually slow.',
    skills: ['laravel', 'php', 'mysql', 'docker', 'github-actions', 'linux-admin'],
    items: ['Laravel monolith → Docker migration', 'VPS hardening and CI rollout'],
    websiteUrl: null,
  },
  {
    id: 'P5',
    name: 'Ana — thin profile, external URL only',
    bio: 'Full-stack dev. I build stores and sites for small businesses. See my site.',
    skills: ['wordpress', 'shopify', 'html-css'],
    items: [],
    websiteUrl: 'https://example.com/ana',
  },
  // ── Distractors. These exist to test the project's core claim: that shipped evidence
  //    beats keyword overlap. Each one shares vocabulary with a brief but lacks the depth.
  {
    id: 'P6',
    name: 'Ben — Next.js frontend specialist',
    bio:
      'React and Next.js interfaces, Tailwind, component systems, accessibility. I have ' +
      'consumed a payments API but never owned the integration.',
    skills: ['react', 'nextjs', 'typescript', 'tailwind', 'accessibility'],
    items: ['Marketing site rebuild', 'Design system in Storybook'],
    websiteUrl: 'https://example.com/ben',
    distractorFor: 'J1',
  },
  {
    id: 'P7',
    name: 'Chloe — no-code automation consultant',
    bio:
      'I set up Zapier for small teams — form to spreadsheet to email. Comfortable in ' +
      'prebuilt connectors; I do not write custom OAuth apps or handle retries in code.',
    skills: ['zapier', 'airtable', 'google-apps-script'],
    items: ['Lead-routing Zap for an agency'],
    websiteUrl: null,
    distractorFor: 'J2',
  },
  {
    id: 'P8',
    name: 'Ravi — Python data / ML engineer',
    bio:
      'Embeddings, clustering and classification pipelines in Python. Strong on vector maths ' +
      'and evaluation; I have not shipped a customer-facing chatbot.',
    skills: ['python', 'vector-search', 'etl', 'bigquery'],
    items: ['Churn model + feature pipeline', 'Semantic dedup for a product catalogue'],
    websiteUrl: null,
    distractorFor: 'J3',
  },
  {
    id: 'P9',
    name: 'Lena — DevOps and platform engineer',
    bio:
      'Docker, Kubernetes, Terraform, CI/CD. I containerise and ship things. No PHP — I have ' +
      'not worked in a Laravel codebase.',
    skills: ['docker', 'kubernetes', 'terraform', 'github-actions', 'linux-admin', 'observability'],
    items: ['K8s migration for a fintech', 'Terraform module library'],
    websiteUrl: 'https://example.com/lena',
    distractorFor: 'J4',
  },
  {
    id: 'P10',
    name: 'Sam — Shopify developer',
    bio:
      'Shopify themes and apps: Liquid, Polaris, Shopify Payments, conversion work. ' +
      'E-commerce is my whole practice, but I do not work in WordPress.',
    skills: ['shopify', 'payment-integration', 'performance', 'developer-seo', 'javascript'],
    items: ['Headless Shopify storefront', 'Checkout extension app'],
    websiteUrl: 'https://example.com/sam',
    distractorFor: 'J5',
  },
];

/**
 * Hand-labelled relevance, job → profile. Reused transposed for the talent direction.
 * Reasoning for every non-zero cell is in docs/eval-set.md §3.
 */
export const evalGrades: Record<string, Record<string, Grade>> = {
  J1: { P1: 2, P2: 1, P3: 0, P4: 0, P5: 0, P6: 1, P7: 0, P8: 0, P9: 0, P10: 1 },
  J2: { P1: 1, P2: 2, P3: 0, P4: 0, P5: 0, P6: 0, P7: 1, P8: 0, P9: 0, P10: 0 },
  J3: { P1: 0, P2: 0, P3: 2, P4: 0, P5: 0, P6: 0, P7: 0, P8: 1, P9: 0, P10: 0 },
  J4: { P1: 0, P2: 0, P3: 0, P4: 2, P5: 0, P6: 0, P7: 0, P8: 0, P9: 1, P10: 0 },
  J5: { P1: 1, P2: 0, P3: 0, P4: 1, P5: 1, P6: 0, P7: 0, P8: 0, P9: 0, P10: 1 },
};

/**
 * J5 has no grade-2 profile by design: nobody in the pool has actually shipped WooCommerce.
 * It is the calibration case, not a ranking case — the system must say "no strong matches"
 * rather than promote an adjacent profile to the top slot with a confident score.
 */
export const calibrationJobs = ['J5'] as const;

/** Profiles whose only evidence is an external URL. Measured, not assumed (PROJECT.md §8). */
export const thinProfiles = ['P5'] as const;

// ───────────────────────────── metrics ─────────────────────────────

const dcg = (graded: number[]): number =>
  graded.reduce((sum, rel, i) => sum + rel / Math.log2(i + 2), 0);

/**
 * Normalised discounted cumulative gain over the top `k` of a ranking.
 *
 * This replaces precision@5. Precision@k assumes at least k relevant items exist per query;
 * here relevance is deliberately sparse (most jobs have one right answer and one near-miss),
 * so precision@5 was capped far below its own gate. nDCG handles graded labels and sparse
 * relevance, and it rewards putting the grade-2 profile *first* rather than merely present.
 *
 * @param ranked  candidate ids in the order the system returned them
 * @param grades  id → grade for this query
 */
export function ndcgAt(ranked: string[], grades: Record<string, Grade>, k: number): number {
  const actual = dcg(ranked.slice(0, k).map((id) => grades[id] ?? 0));
  const ideal = dcg(
    Object.values(grades)
      .slice()
      .sort((a, b) => b - a)
      .slice(0, k),
  );
  return ideal === 0 ? 1 : actual / ideal;
}

/** 1 if the top-ranked candidate is a grade-2 match, else 0. The metric users actually feel. */
export function precisionAt1(ranked: string[], grades: Record<string, Grade>): 0 | 1 {
  const top = ranked[0];
  return top !== undefined && grades[top] === 2 ? 1 : 0;
}

/**
 * Grades for one job, as a total record. Throws on an unknown id rather than returning
 * undefined — a missing row in the eval set is a broken fixture, not a zero score, and
 * silently scoring it as 0 would make a broken set look like a merely mediocre ranker.
 */
export function gradesForJob(jobId: string): Record<string, Grade> {
  const row = evalGrades[jobId];
  if (!row) throw new Error(`No eval grades for job "${jobId}"`);
  return row;
}

/** Grades for one profile across every job, for the talent direction. */
export function gradesForProfile(profileId: string): Record<string, Grade> {
  const out: Record<string, Grade> = {};
  for (const [jobId, row] of Object.entries(evalGrades)) {
    const g = row[profileId];
    if (g === undefined) throw new Error(`No eval grade for ${jobId}×${profileId}`);
    out[jobId] = g;
  }
  return out;
}

/**
 * Phase 4 exit gates (M3). Replaces "precision@5 >= 0.8", which a perfect ranker could not
 * have reached on this set — its ceiling was 0.32. See docs/eval-set.md §4.
 */
export const evalGates = {
  /** Mean nDCG@5 over J1–J4, client direction (ranking profiles for a job). */
  clientNdcgAt5: 0.85,
  /** Mean nDCG@3 over P1–P10, talent direction (ranking jobs for a profile). */
  talentNdcgAt3: 0.85,
  /** J1–J4 must each put their grade-2 profile first. J5 is excluded — it has none. */
  precisionAt1: 1.0,
  /** J5: the best score returned must stay under the "strong match" display threshold. */
  calibrationMaxScore: 70,
} as const;
