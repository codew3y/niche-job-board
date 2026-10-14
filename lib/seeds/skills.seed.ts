// Skill taxonomy seed — Phase 0 deliverable
// 126 skills across 10 categories. Feeds the Phase 1 seed script directly.
//
// Fields: name (canonical) · slug (unique) · category · aliases[] · sources[] · evidence
//   - `sources` is machine-checkable: every row carries >= 2 source codes, OR exactly one
//     code plus NICHE (a deliberate corner-coverage entry).
//   - `evidence` is the human-readable note explaining what those sources actually said.
//
// Invariants enforced by lib/seeds/skills.seed.test.ts — run it before trusting this file:
//   1. slugs unique; slug is the kebab-case identity used by the DB
//   2. canonical names unique (case-insensitive)
//   3. no alias appears twice anywhere in the file
//   4. no alias equals any canonical name  (aliases resolve TO a row, never shadow one)
//   5. every row satisfies the two-source bar
//
// Source codes (all verified 2026-09-20 — see docs/taxonomy.md for full citations):
//   SO25  Stack Overflow Developer Survey 2025 (49,009 resp.; technology section n=31,771)
//   JB25  JetBrains State of Developer Ecosystem 2025 (24,534 resp., 194 countries)
//   GH25  GitHub Octoverse 2025 (window Sep 2024 – Aug 2025)
//   SJS25 State of JS 2025 (13,002 resp., Sep–Nov 2025)
//   SCS25 State of CSS 2025
//   UP26  Upwork In-Demand Skills 2026
//   RM    roadmap.sh role roadmaps
//   COMP  Competitor skill pickers & per-skill hire pages (Upwork, Toptal, Arc, Contra,
//         Wellfound, Lemon.io), accessed 2026-09-20
//   NICHE Deliberate corner coverage (iPaaS, CRM scripting, RPA,
//         integration mechanics, AI capabilities) — under-represented by surveys by design
//   STACK This project's own stack. Never sufficient alone; always paired.
//   JOBS  Real freelance job posts mined 2026-09-20 (~74 posts across freelancer.com's n8n,
//         Zapier, API and AI categories, plus the RemoteOK feed). The §4.6.1 buyer-side
//         mining that the first pass proxied and never actually did.
//
// Review cadence: annually; prune zero-use after 12mo; promote >=3 "request a skill" repeats.
// See docs/taxonomy.md for the granularity rule, the alias policy and every exclusion.

export type SkillCategory =
  | 'Languages'
  | 'Frontend'
  | 'Mobile'
  | 'Backend'
  | 'Data'
  | 'Cloud & DevOps'
  | 'Automation & integration'
  | 'Platforms & CMS'
  | 'AI/ML'
  | 'Practices';

export type SkillSource =
  | 'SO25'
  | 'JB25'
  | 'GH25'
  | 'SJS25'
  | 'SCS25'
  | 'UP26'
  | 'RM'
  | 'COMP'
  | 'NICHE'
  | 'STACK'
  | 'JOBS';

export type SkillSeed = {
  name: string;
  slug: string;
  category: SkillCategory;
  aliases: string[];
  sources: SkillSource[];
  evidence: string;
};

export const skillsSeed: SkillSeed[] = [
  // ─────────────────────────────── Languages (15) ───────────────────────────────
  {
    name: 'JavaScript',
    slug: 'javascript',
    category: 'Languages',
    aliases: ['JS', 'ECMAScript', 'vanilla JS'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 #1 language, 66.0% usage · GH25 #3 by contributors, 2.15M (+24.8% YoY)',
  },
  {
    name: 'TypeScript',
    slug: 'typescript',
    category: 'Languages',
    aliases: ['TS', 'TypeScript strict'],
    sources: ['GH25', 'SO25'],
    evidence: 'GH25 #1 for the first time, 2,636,006 contributors (+66.6% YoY) · SO25 43.6%',
  },
  {
    name: 'Python',
    slug: 'python',
    category: 'Languages',
    aliases: ['Python 3', 'py'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 57.9%, +7pp YoY (largest language gain) · GH25 #2, 2.6M (+48.8%)',
  },
  {
    name: 'SQL',
    slug: 'sql',
    category: 'Languages',
    aliases: ['ANSI SQL', 'SQL queries'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 #3 at 58.6% · RM has a dedicated SQL roadmap; universal filter skill',
  },
  {
    name: 'Bash / Shell',
    slug: 'bash',
    category: 'Languages',
    aliases: ['Shell scripting', 'sh', 'zsh'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 #5 at 48.7% · RM Linux/Bash roadmap; the glue language of automation gigs',
  },
  {
    name: 'PowerShell',
    slug: 'powershell',
    category: 'Languages',
    aliases: ['pwsh', 'Windows scripting'],
    sources: ['SO25', 'NICHE'],
    evidence:
      'SO25 #10 at 23.2% — ahead of PHP, Go and Rust. Added 2026-09-20: the Windows/M365 half ' +
      'of the automation corner, and the natural pair for the Power Automate row.',
  },
  {
    name: 'Java',
    slug: 'java',
    category: 'Languages',
    aliases: ['JVM', 'Java 21'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 29.4% · GH25 +20.7% YoY (>100k new contributors)',
  },
  {
    name: 'C#',
    slug: 'csharp',
    category: 'Languages',
    aliases: ['C-Sharp', 'dotnet language'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 27.8% · GH25 +22.2% YoY (>100k new contributors)',
  },
  {
    name: 'PHP',
    slug: 'php',
    category: 'Languages',
    aliases: ['PHP 8'],
    sources: ['SO25', 'GH25'],
    evidence:
      'SO25 18.9% · GH25 Blade (Laravel templating) +67% with 91.1k contributors. ' +
      'Declining in surveys, disproportionately present in freelance work via WP + Laravel.',
  },
  {
    name: 'Go',
    slug: 'go',
    category: 'Languages',
    aliases: ['Golang'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 16.4% · GH25 names Go alongside HCL/Dockerfiles as cloud-native growth',
  },
  {
    name: 'Rust',
    slug: 'rust',
    category: 'Languages',
    aliases: ['rs'],
    sources: ['SO25', 'JB25'],
    evidence:
      'SO25 14.8% usage; Rust tooling dominates the admired lists (Cargo 71%, uv 74% — uv is ' +
      'Rust-built) · JB25 top of the promise index',
  },
  {
    name: 'Kotlin',
    slug: 'kotlin',
    category: 'Languages',
    aliases: ['kt'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 10.8% · RM Android roadmap; Android-default and a JVM backend option',
  },
  {
    name: 'Ruby',
    slug: 'ruby',
    category: 'Languages',
    aliases: ['rb'],
    sources: ['SO25', 'COMP'],
    evidence: 'SO25 6.4% · COMP: Rails MVP work persists on every marketplace picker',
  },
  {
    name: 'Dart',
    slug: 'dart',
    category: 'Languages',
    aliases: ['Dart 3'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 5.9% · RM Flutter roadmap',
  },
  {
    name: 'Swift',
    slug: 'swift',
    category: 'Languages',
    aliases: ['Swift 6'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 5.4% · RM iOS roadmap',
  },

  // ─────────────────────────────── Frontend (14) ────────────────────────────────
  {
    name: 'React',
    slug: 'react',
    category: 'Frontend',
    aliases: ['React.js', 'ReactJS'],
    sources: ['SO25', 'SJS25'],
    evidence: 'SO25 #2 web framework at 44.7% · SJS25 #1 front-end framework, ~83% usage',
  },
  {
    name: 'Next.js',
    slug: 'nextjs',
    category: 'Frontend',
    aliases: ['Next', 'App Router'],
    sources: ['SO25', 'SJS25'],
    evidence:
      'SO25 #4 web framework at 20.8% · SJS25 59% usage, the most-used meta-framework ' +
      '(though Astro leads it on satisfaction by 39pp)',
  },
  {
    name: 'Vue.js',
    slug: 'vue',
    category: 'Frontend',
    aliases: ['Vue', 'Vue 3'],
    sources: ['SO25', 'SJS25'],
    evidence: 'SO25 17.6% · SJS25 #2 front-end framework at ~51%',
  },
  {
    name: 'Nuxt',
    slug: 'nuxt',
    category: 'Frontend',
    aliases: ['Nuxt 4', 'Nuxt.js'],
    sources: ['SO25', 'SJS25'],
    evidence:
      'SO25 4.0% · SJS25 tracked meta-framework. Added 2026-09-20: previously folded into ' +
      'Vue.js, which was inconsistent with Next.js having its own row. Clears the ' +
      'meta-framework rule (named in SO25 + hired by name on COMP pages).',
  },
  {
    name: 'Angular',
    slug: 'angular',
    category: 'Frontend',
    aliases: ['ng', 'Angular 20'],
    sources: ['SO25', 'SJS25'],
    evidence: 'SO25 18.2% (plus AngularJS 7.2% in legacy maintenance) · SJS25 ~50%',
  },
  {
    name: 'Svelte',
    slug: 'svelte',
    category: 'Frontend',
    aliases: ['SvelteKit', 'Svelte 5'],
    sources: ['SO25', 'SJS25'],
    evidence:
      'SO25 7.2% · SJS25 ~26% usage with the strongest positive sentiment. SvelteKit stays ' +
      'an alias: it is not separately named in SO25 and clients hire "Svelte".',
  },
  {
    name: 'Astro',
    slug: 'astro',
    category: 'Frontend',
    aliases: ['Astro islands'],
    sources: ['SO25', 'GH25', 'SJS25'],
    evidence:
      'SO25 4.5% · GH25 +78% YoY, 45.6k contributors (a top-3 fastest grower) · ' +
      'SJS25 #1 meta-framework satisfaction, +39pp over Next.js',
  },
  {
    name: 'jQuery',
    slug: 'jquery',
    category: 'Frontend',
    aliases: ['jQuery maintenance'],
    sources: ['SO25', 'COMP'],
    evidence:
      'SO25 #3 web framework at 23.4% — higher than Next.js. Added 2026-09-20: excluding it ' +
      'made the large "keep this old site alive" segment untaggable. Pairs with ' +
      'legacy-modernization.',
  },
  {
    name: 'Tailwind CSS',
    slug: 'tailwind',
    category: 'Frontend',
    aliases: ['TailwindCSS', 'utility-first CSS'],
    sources: ['SCS25', 'STACK'],
    evidence: 'SCS25 #1 CSS framework, ~37% active use vs Bootstrap 21.6% · this project uses it',
  },
  {
    name: 'Bootstrap',
    slug: 'bootstrap',
    category: 'Frontend',
    aliases: ['BS5'],
    sources: ['SCS25', 'COMP'],
    evidence: 'SCS25 #2 CSS framework at 21.6% · COMP: standard on legacy-maintenance briefs',
  },
  {
    name: 'Sass',
    slug: 'sass',
    category: 'Frontend',
    aliases: ['SCSS', 'CSS preprocessing'],
    sources: ['SCS25', 'COMP'],
    evidence: 'SCS25 top preprocessor answer (though preprocessor use is declining overall)',
  },
  {
    name: 'shadcn/ui',
    slug: 'shadcn-ui',
    category: 'Frontend',
    aliases: ['shadcn'],
    sources: ['COMP', 'STACK'],
    evidence:
      'COMP: now a named line item on marketplace pickers and rate cards · this project uses it. ' +
      'Weakest-sourced row in the file — first candidate for pruning at the annual review. ' +
      'Radix UI is NOT an alias: it is a distinct primitive library.',
  },
  {
    name: 'Vite',
    slug: 'vite',
    category: 'Frontend',
    aliases: ['vitejs'],
    sources: ['SO25', 'SJS25'],
    evidence:
      'SO25 25.4% · SJS25 net +55 sentiment (56% positive / 1% negative) vs webpack net −23. ' +
      'Note: webpack still edges it on raw adoption (86.4% vs 84.4%) — Vite wins on sentiment, ' +
      'not yet on installed base.',
  },
  {
    name: 'HTML / CSS',
    slug: 'html-css',
    category: 'Frontend',
    aliases: ['HTML5', 'CSS3', 'semantic markup'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 #2 at 61.9% · RM frontend foundations',
  },

  // ──────────────────────────────── Mobile (4) ──────────────────────────────────
  // New category (2026-09-20). Previously scattered: React Native/Flutter sat under
  // Frontend and Swift/Kotlin/Dart under Languages, so "mobile app" was unfilterable
  // despite being a top-level buying category on every marketplace.
  {
    name: 'React Native',
    slug: 'react-native',
    category: 'Mobile',
    aliases: ['RN', 'Expo'],
    sources: ['COMP', 'RM'],
    evidence: 'COMP: dedicated hire pages on Upwork/Toptal/Arc · RM React Native roadmap',
  },
  {
    name: 'Flutter',
    slug: 'flutter',
    category: 'Mobile',
    aliases: ['Flutter SDK', 'cross-platform mobile'],
    sources: ['COMP', 'RM'],
    evidence: 'COMP: dedicated hire pages · RM Flutter roadmap · SO25 Dart 5.9% underpins it',
  },
  {
    name: 'iOS app development',
    slug: 'ios',
    category: 'Mobile',
    aliases: ['SwiftUI', 'UIKit', 'App Store submission'],
    sources: ['COMP', 'RM'],
    evidence: 'COMP: "iOS developer" is a first-class marketplace category · RM iOS roadmap',
  },
  {
    name: 'Android app development',
    slug: 'android',
    category: 'Mobile',
    aliases: ['Jetpack Compose', 'Android SDK', 'Play Store submission'],
    sources: ['COMP', 'RM'],
    evidence:
      'COMP: "Android developer" is a first-class marketplace category · RM Android roadmap',
  },

  // ─────────────────────────────── Backend (11) ─────────────────────────────────
  {
    name: 'Node.js',
    slug: 'nodejs',
    category: 'Backend',
    aliases: ['Node', 'Bun', 'Deno'],
    sources: ['SO25', 'RM'],
    evidence:
      'SO25 #1 web technology at 48.7% · RM backend roadmap. Bun and Deno are deliberately ' +
      'folded in as aliases (neither reaches the SO25 top-20); this is a known-lossy coarse ' +
      'bucket — split them out if request-a-skill traffic justifies it.',
  },
  {
    name: 'Express.js',
    slug: 'express',
    category: 'Backend',
    aliases: ['Express', 'Expressjs'],
    sources: ['SO25', 'RM'],
    evidence:
      'SO25 19.9% · RM backend roadmap. The old "REST API" alias was removed — it collided ' +
      'with the REST API integration row and mis-resolved generic briefs to Express.',
  },
  {
    name: 'NestJS',
    slug: 'nestjs',
    category: 'Backend',
    aliases: ['Nest'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 6.7% · RM backend roadmap; the senior-Node enterprise idiom',
  },
  {
    name: 'ASP.NET Core',
    slug: 'aspnet-core',
    category: 'Backend',
    aliases: ['.NET', 'ASP.NET', 'Blazor'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 19.7% (plus legacy ASP.NET 14.2%, Blazor 7.0%) · RM ASP.NET Core roadmap',
  },
  {
    name: 'FastAPI',
    slug: 'fastapi',
    category: 'Backend',
    aliases: ['Pydantic', 'async Python API'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 14.8%, +5pp YoY — the largest single framework gain in the survey · RM',
  },
  {
    name: 'Flask',
    slug: 'flask',
    category: 'Backend',
    aliases: ['Jinja', 'WSGI'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 14.4% · RM Python backend path',
  },
  {
    name: 'Django',
    slug: 'django',
    category: 'Backend',
    aliases: ['Django REST Framework', 'DRF'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 12.6% · RM Django roadmap',
  },
  {
    name: 'Spring Boot',
    slug: 'spring-boot',
    category: 'Backend',
    aliases: ['Spring', 'Java backend'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 14.7% · RM Spring Boot roadmap',
  },
  {
    name: 'Laravel',
    slug: 'laravel',
    category: 'Backend',
    aliases: ['Blade', 'Eloquent', 'Livewire', 'Filament'],
    sources: ['SO25', 'GH25'],
    evidence: 'SO25 8.9% · GH25 Blade +67% YoY with 91.1k contributors',
  },
  {
    name: 'Ruby on Rails',
    slug: 'rails',
    category: 'Backend',
    aliases: ['RoR', 'Hotwire'],
    sources: ['SO25', 'COMP'],
    evidence: 'SO25 5.9% · COMP: persistent MVP-build category on every picker',
  },
  {
    name: 'WebSockets & realtime',
    slug: 'websockets',
    category: 'Backend',
    aliases: ['Socket.IO', 'realtime updates', 'server-sent events', 'live presence'],
    sources: ['RM', 'COMP'],
    evidence:
      'RM backend roadmap (realtime section) · COMP: "add live updates/chat/presence" is a ' +
      'recurring brief shape. Added 2026-09-20 — previously no way to tag realtime work.',
  },

  // ──────────────────────────────── Data (12) ───────────────────────────────────
  {
    name: 'PostgreSQL',
    slug: 'postgresql',
    category: 'Data',
    aliases: ['Postgres', 'Neon', 'RDS Postgres'],
    sources: ['SO25', 'RM'],
    evidence:
      'SO25 #1 database at 55.6% — a 15-point gap over MySQL, plus top of both the ' +
      'most-admired (65%) and most-desired (46%) lists · RM SQL roadmap',
  },
  {
    name: 'MySQL',
    slug: 'mysql',
    category: 'Data',
    aliases: ['MariaDB', 'PlanetScale'],
    sources: ['SO25', 'COMP'],
    evidence:
      'SO25 40.5% (+ MariaDB 22.5%, wire-compatible, folded in as an alias) · COMP: the ' +
      'default under WordPress and most Laravel work',
  },
  {
    name: 'SQLite',
    slug: 'sqlite',
    category: 'Data',
    aliases: ['Turso', 'libSQL', 'embedded database'],
    sources: ['SO25', 'COMP'],
    evidence: 'SO25 #3 at 37.5% · COMP: local-first and zero-ops gig vocabulary',
  },
  {
    name: 'Microsoft SQL Server',
    slug: 'mssql',
    category: 'Data',
    aliases: ['MSSQL', 'T-SQL', 'Azure SQL'],
    sources: ['SO25', 'COMP'],
    evidence:
      'SO25 #4 database at 30.1%. Added 2026-09-20: it outranks Redis and MongoDB and is the ' +
      'default pairing for the ASP.NET Core row, which was already in the seed. Its absence ' +
      'made the whole Microsoft-stack freelance segment untaggable.',
  },
  {
    name: 'Redis',
    slug: 'redis',
    category: 'Data',
    aliases: ['Valkey', 'in-memory cache'],
    sources: ['SO25', 'RM'],
    evidence:
      'SO25 28.0%, +8% YoY · RM backend caching. The "queues" alias was removed — it ' +
      'collided with the Queues & background jobs row.',
  },
  {
    name: 'MongoDB',
    slug: 'mongodb',
    category: 'Data',
    aliases: ['Mongoose', 'Atlas', 'NoSQL document store'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 24.0% · RM backend roadmap',
  },
  {
    name: 'Elasticsearch',
    slug: 'elasticsearch',
    category: 'Data',
    aliases: ['OpenSearch', 'full-text search'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 16.7% · RM Elasticsearch roadmap; "add search to my site" gigs',
  },
  {
    name: 'BigQuery',
    slug: 'bigquery',
    category: 'Data',
    aliases: ['data warehouse', 'analytics SQL'],
    sources: ['SO25', 'UP26'],
    evidence: 'SO25 6.5% · UP26 data-analytics demand holds steady YoY',
  },
  {
    name: 'Supabase',
    slug: 'supabase',
    category: 'Data',
    aliases: ['Postgres BaaS'],
    sources: ['SO25', 'STACK'],
    evidence: 'SO25 6.0% — now a tracked database in its own right · this project runs on it',
  },
  {
    name: 'Firebase',
    slug: 'firebase',
    category: 'Data',
    aliases: ['Firestore', 'FCM', 'Realtime Database'],
    sources: ['SO25', 'COMP'],
    evidence: 'SO25 Firestore 5.7% + Realtime DB 5.0% · COMP: the default BaaS on mobile briefs',
  },
  {
    name: 'Drizzle ORM',
    slug: 'drizzle',
    category: 'Data',
    aliases: ['Drizzle'],
    sources: ['COMP', 'STACK'],
    evidence:
      'Added 2026-09-20 as its own row. It was previously an ALIAS OF PRISMA, which was simply ' +
      'wrong — they are competing ORMs, and this project runs on Drizzle. A Drizzle developer ' +
      'would have been mis-resolved to Prisma on every match.',
  },
  {
    name: 'Prisma',
    slug: 'prisma',
    category: 'Data',
    aliases: ['Prisma ORM'],
    sources: ['SJS25', 'COMP'],
    evidence: 'SJS25 tracked ORM · COMP: named on TypeScript-stack briefs',
  },

  // ───────────────────────── Cloud & DevOps (12) ────────────────────────────────
  {
    name: 'AWS',
    slug: 'aws',
    category: 'Cloud & DevOps',
    aliases: ['Amazon Web Services', 'EC2', 'S3', 'IAM', 'DynamoDB'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 #1 cloud platform at 43.3% · RM AWS roadmap. DynamoDB (SO25 9.8%) folds in.',
  },
  {
    name: 'Microsoft Azure',
    slug: 'azure',
    category: 'Cloud & DevOps',
    aliases: ['Entra ID', 'App Service'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 26.3% · RM cloud roadmap; the enterprise/M365 path',
  },
  {
    name: 'Google Cloud',
    slug: 'gcp',
    category: 'Cloud & DevOps',
    aliases: ['GCP', 'Cloud Run'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 24.6% · RM cloud roadmap',
  },
  {
    name: 'Cloudflare',
    slug: 'cloudflare',
    category: 'Cloud & DevOps',
    aliases: ['Cloudflare Workers', 'R2', 'CDN setup'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 20.1% · RM Cloudflare content; edge/DNS/performance gigs',
  },
  {
    name: 'Vercel',
    slug: 'vercel',
    category: 'Cloud & DevOps',
    aliases: ['Netlify', 'Jamstack hosting'],
    sources: ['COMP', 'STACK'],
    evidence:
      'COMP: named on frontend rate cards · this project deploys to it. Netlify is folded in ' +
      'as a deliberate coarse bucket — the hireable skill ("ship a Next/Astro app to a ' +
      'managed edge host") is the same; split if request traffic justifies it.',
  },
  {
    name: 'Docker',
    slug: 'docker',
    category: 'Cloud & DevOps',
    aliases: ['containers', 'Docker Compose', 'Dockerfile'],
    sources: ['SO25', 'RM'],
    evidence:
      'SO25 71.1% — and a +17pp jump YoY, the largest single-year increase of ANY technology ' +
      'in the survey · RM DevOps roadmap',
  },
  {
    name: 'Kubernetes',
    slug: 'kubernetes',
    category: 'Cloud & DevOps',
    aliases: ['K8s', 'Helm'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 28.5% · RM Kubernetes roadmap',
  },
  {
    name: 'Terraform',
    slug: 'terraform',
    category: 'Cloud & DevOps',
    aliases: ['IaC', 'HCL', 'OpenTofu'],
    sources: ['SO25', 'GH25'],
    evidence:
      'SO25 17.8% · GH25 HCL +36% YoY. (The previous seed recorded +25% — that figure was ' +
      'wrong; corrected against the Octoverse 2025 report 2026-09-20.)',
  },
  {
    name: 'GitHub Actions',
    slug: 'github-actions',
    category: 'Cloud & DevOps',
    aliases: ['CI/CD pipelines', 'GitLab CI', 'build pipeline'],
    sources: ['RM', 'STACK'],
    evidence: 'RM DevOps roadmap · this project gates every PR on it; near-universal on GH25',
  },
  {
    name: 'Linux server admin',
    slug: 'linux-admin',
    category: 'Cloud & DevOps',
    aliases: ['VPS setup', 'Ubuntu', 'nginx', 'server hardening'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 Bash/Shell 48.7% as proxy · RM Linux roadmap; host-harden-maintain gigs',
  },
  {
    name: 'Serverless functions',
    slug: 'serverless',
    category: 'Cloud & DevOps',
    aliases: ['AWS Lambda', 'edge functions', 'Cloud Functions'],
    sources: ['COMP', 'RM'],
    evidence:
      'COMP: "Lambda integrations" is verbatim rate-card language · RM DevOps. Deliberately ' +
      'platform-agnostic so AWS/GCP/edge do not fragment into three sibling rows.',
  },
  {
    name: 'Observability & monitoring',
    slug: 'observability',
    category: 'Cloud & DevOps',
    aliases: ['Sentry', 'Grafana', 'Datadog', 'error tracking', 'log aggregation'],
    sources: ['RM', 'COMP'],
    evidence:
      'RM DevOps roadmap · COMP: "set up monitoring/alerting" is a standard retainer add-on. ' +
      'Added 2026-09-20 — the previous seed excluded this as long tail, but the outcome ' +
      '("know when it breaks") is what clients buy, not the individual vendor.',
  },

  // ─────────────────── Automation & integration (20) ────────────────────────────
  {
    name: 'Zapier',
    slug: 'zapier',
    category: 'Automation & integration',
    aliases: ['Zaps'],
    sources: ['NICHE', 'COMP'],
    evidence:
      'NICHE iPaaS coverage · COMP: dedicated hire pages. The bare "automation" alias was ' +
      'removed — it was generic enough to swallow every unrelated automation brief.',
  },
  {
    name: 'Make',
    slug: 'make',
    category: 'Automation & integration',
    aliases: ['Integromat', 'Make scenarios'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE iPaaS coverage · COMP: dedicated hire pages',
  },
  {
    name: 'n8n',
    slug: 'n8n',
    category: 'Automation & integration',
    aliases: ['self-hosted automation'],
    sources: ['NICHE', 'COMP'],
    evidence:
      'NICHE iPaaS coverage · COMP: dedicated n8n hire pages on BOTH Upwork and Toptal — the ' +
      'developer-facing iPaaS of choice',
  },
  {
    name: 'Power Automate',
    slug: 'power-automate',
    category: 'Automation & integration',
    aliases: ['Microsoft Flow', 'Power Platform', 'Power Apps'],
    sources: ['NICHE', 'COMP'],
    evidence:
      'NICHE iPaaS coverage · COMP: the M365/enterprise automation path; pairs with PowerShell',
  },
  {
    name: 'Workato',
    slug: 'workato',
    category: 'Automation & integration',
    aliases: ['Workato recipes', 'enterprise iPaaS'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE iPaaS coverage · COMP: enterprise connector gigs',
  },
  {
    name: 'Tray.ai',
    slug: 'tray-ai',
    category: 'Automation & integration',
    aliases: ['Tray.io'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE iPaaS coverage · COMP: low-code integration listings',
  },
  {
    name: 'Google Apps Script',
    slug: 'google-apps-script',
    category: 'Automation & integration',
    aliases: ['Apps Script', 'Google Workspace automation', 'Google Sheets automation'],
    sources: ['COMP', 'NICHE'],
    evidence:
      'COMP: dedicated hire pages on Upwork, Arc and Toptal (as Sheets/Apps Script). ' +
      'Added 2026-09-20 — the Google half of the SMB-automation corner, and a heavy source of ' +
      'small, well-scoped gigs that had no home in the taxonomy.',
  },
  {
    name: 'REST API integration',
    slug: 'rest-api-integration',
    category: 'Automation & integration',
    aliases: ['third-party API integration', 'API consumption'],
    sources: ['UP26', 'RM'],
    evidence:
      'UP26 AI Integration +178% is largely API-wiring work · RM API roadmap. This row is ' +
      'CONSUMING someone else’s API; designing your own is the separate api-design row.',
  },
  {
    name: 'GraphQL',
    slug: 'graphql',
    category: 'Automation & integration',
    aliases: ['Apollo', 'Relay'],
    sources: ['RM', 'COMP'],
    evidence: 'RM GraphQL roadmap · COMP: standard picker entry',
  },
  {
    name: 'Webhooks',
    slug: 'webhooks',
    category: 'Automation & integration',
    aliases: ['event callbacks', 'webhook handlers', 'signature verification'],
    sources: ['NICHE', 'STACK'],
    evidence:
      'NICHE integration mechanics · this project ships /api/webhooks. Clients describe the ' +
      'problem ("keep these two systems in sync"); developers name the mechanism — the ' +
      'aliases bridge the two.',
  },
  {
    name: 'OAuth & identity flows',
    slug: 'oauth',
    category: 'Automation & integration',
    aliases: ['OAuth2', 'OIDC', 'SSO', 'SAML'],
    sources: ['NICHE', 'RM'],
    evidence: 'NICHE integration mechanics · RM backend auth section; every SaaS sync needs it',
  },
  {
    name: 'ETL / data pipelines',
    slug: 'etl',
    category: 'Automation & integration',
    aliases: ['data extraction', 'Airbyte', 'data migration', 'data sync'],
    sources: ['UP26', 'NICHE'],
    evidence: 'UP26 data-analytics + AI-data demand · NICHE integration mechanics',
  },
  {
    name: 'Queues & background jobs',
    slug: 'queues',
    category: 'Automation & integration',
    aliases: ['RabbitMQ', 'SQS', 'BullMQ', 'Celery', 'job workers'],
    sources: ['NICHE', 'RM'],
    evidence: 'NICHE integration mechanics · RM backend roadmap; async/reliability work',
  },
  {
    name: 'Cron & scheduling',
    slug: 'cron',
    category: 'Automation & integration',
    aliases: ['pg_cron', 'scheduled jobs', 'recurring tasks'],
    sources: ['NICHE', 'STACK'],
    evidence: 'NICHE integration mechanics · this project uses Supabase Cron (managed pg_cron)',
  },
  {
    name: 'Web scraping',
    slug: 'web-scraping',
    category: 'Automation & integration',
    aliases: ['Puppeteer', 'Selenium', 'crawler', 'data harvesting'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 data-extraction demand · COMP: dedicated hire pages. "Playwright" is deliberately ' +
      'NOT an alias here — it resolves to automated-testing, and having it on both rows made ' +
      'alias lookup ambiguous.',
  },
  {
    name: 'RPA',
    slug: 'rpa',
    category: 'Automation & integration',
    aliases: ['UiPath', 'Automation Anywhere', 'Blue Prism', 'robotic process automation'],
    sources: ['NICHE', 'COMP'],
    evidence:
      'NICHE RPA coverage · COMP: enterprise back-office listings. Renamed from "RPA (UiPath)" ' +
      'so the canonical name is vendor-neutral and UiPath resolves as an alias.',
  },
  {
    name: 'WhatsApp Business API',
    slug: 'whatsapp-api',
    category: 'Automation & integration',
    aliases: ['WhatsApp Cloud API', 'WABA', 'WhatsApp chatbot', 'WhatsApp automation'],
    sources: ['JOBS', 'COMP'],
    evidence:
      'JOBS: the single most frequent named platform in the 2026-09-20 job-post mining — 5 of ' +
      '74 posts, appearing across the n8n, Zapier and API categories (appointment booking, ' +
      'lead funnels, dynamic replies) · COMP: dedicated hire pages on Upwork and Flexiple. ' +
      'The work is integration plumbing — Meta app setup, webhooks, template approval — not ' +
      'the AI layer, so it belongs here rather than under chatbots.',
  },
  {
    name: 'Twilio (SMS & voice)',
    slug: 'twilio',
    category: 'Automation & integration',
    aliases: ['SMS integration', 'IVR', 'programmable voice', 'TwiML', 'A2P 10DLC'],
    sources: ['JOBS', 'COMP'],
    evidence:
      'JOBS: 2 of 74 posts named Twilio specifically (SMS opt-in, Trust Hub verification) · ' +
      'COMP: dedicated hire pages on Upwork, Fiverr, Freelancer, Guru AND Toptal. ' +
      'Added 2026-09-20 — the previous seed excluded Twilio as "folds into REST API ' +
      'integration", which the mining disproved: buyers hire for it by name.',
  },
  {
    name: 'Chat platform bots',
    slug: 'chat-platform-bots',
    category: 'Automation & integration',
    aliases: ['Telegram bot', 'Discord bot', 'Slack app', 'Slack bot'],
    sources: ['JOBS', 'NICHE'],
    evidence:
      'JOBS: 3 of 74 posts (Telegram booking assistant, Telegram monitoring, bot development) · ' +
      'NICHE messaging-automation corner. Weaker than the two rows above — on the prune ' +
      'watchlist if request traffic does not confirm it.',
  },
  {
    name: 'Payment integration',
    slug: 'payment-integration',
    category: 'Automation & integration',
    aliases: ['Stripe', 'PayPal', 'checkout flow', 'billing', 'subscriptions'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 e-commerce demand · COMP: near-universal picker entry. NOTE: the slug was ' +
      '"stripe" in the previous seed while the name was "Payment integration" — a genuine ' +
      'bug that would have shipped a misleading URL and filter key. Fixed 2026-09-20.',
  },

  // ───────────────────────── Platforms & CMS (14) ───────────────────────────────
  {
    name: 'WordPress',
    slug: 'wordpress',
    category: 'Platforms & CMS',
    aliases: ['WP', 'Elementor', 'ACF', 'WordPress plugin'],
    sources: ['SO25', 'COMP'],
    evidence: 'SO25 #13 web technology at 13.6% · COMP: the single largest SMB freelance segment',
  },
  {
    name: 'WooCommerce',
    slug: 'woocommerce',
    category: 'Platforms & CMS',
    aliases: ['Woo', 'WordPress e-commerce'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 e-commerce demand · COMP: dedicated hire pages. Split out from the WordPress ' +
      'alias list 2026-09-20 — "build me a WooCommerce store" is a distinct buying intent ' +
      'with a distinct skill set, and Shopify already had its own row.',
  },
  {
    name: 'Magento',
    slug: 'magento',
    category: 'Platforms & CMS',
    aliases: ['Adobe Commerce'],
    sources: ['JOBS', 'COMP'],
    evidence:
      'JOBS: named alongside Shopify and WooCommerce in an e-commerce automation brief · ' +
      'COMP: long-standing dedicated hire category. Completes the big three of e-commerce ' +
      'platforms — the seed already had the other two.',
  },
  {
    name: 'Shopify',
    slug: 'shopify',
    category: 'Platforms & CMS',
    aliases: ['Liquid', 'Polaris', 'Shopify app', 'Shopify theme'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 e-commerce demand · COMP: dedicated hire pages. The alias list is the ' +
      'client/developer bridge: buyers write "Shopify app", developers write "Liquid".',
  },
  {
    name: 'Webflow',
    slug: 'webflow',
    category: 'Platforms & CMS',
    aliases: ['Webflow CMS', 'Framer'],
    sources: ['COMP', 'UP26'],
    evidence: 'COMP: dedicated hire pages · UP26 web-design demand; design-to-build handoff gigs',
  },
  {
    name: 'Wix / Squarespace',
    slug: 'wix-squarespace',
    category: 'Platforms & CMS',
    aliases: ['Wix', 'Squarespace', 'site builder'],
    sources: ['COMP', 'UP26'],
    evidence:
      'COMP: SMB freelance staple · UP26 web-design demand. Deliberately compound — the two ' +
      'are one hireable unit at this granularity and splitting them adds no filter value.',
  },
  {
    name: 'Headless CMS',
    slug: 'headless-cms',
    category: 'Platforms & CMS',
    aliases: ['Strapi', 'Sanity', 'Contentful', 'Payload CMS', 'Directus'],
    sources: ['SJS25', 'COMP'],
    evidence:
      'SJS25 tracks the category · COMP: standard on Next/Astro briefs. Capability-level by ' +
      'design: the individual products churn and none clears the bar alone.',
  },
  {
    name: 'Salesforce',
    slug: 'salesforce',
    category: 'Platforms & CMS',
    aliases: ['Apex', 'SOQL', 'Salesforce Flow', 'Lightning'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE CRM-scripting coverage · COMP: enterprise listings',
  },
  {
    name: 'HubSpot',
    slug: 'hubspot',
    category: 'Platforms & CMS',
    aliases: ['HubSpot API', 'HubSpot workflows'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE CRM-scripting coverage · COMP: CRM-automation gigs (see eval brief J2)',
  },
  {
    name: 'Zoho',
    slug: 'zoho',
    category: 'Platforms & CMS',
    aliases: ['Deluge', 'Zoho CRM', 'Zoho Creator'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE CRM-scripting coverage · COMP: Deluge is a real, searched-for scripting skill',
  },
  {
    name: 'Odoo',
    slug: 'odoo',
    category: 'Platforms & CMS',
    aliases: ['Odoo ERP', 'OpenERP'],
    sources: ['COMP', 'NICHE'],
    evidence:
      'COMP: dedicated hire pages on Upwork, Toptal AND Truelancer. Added 2026-09-20 — a ' +
      'substantial ERP-customisation freelance economy (Python + PostgreSQL + Docker) that ' +
      'the surveys never surface and the previous seed missed entirely.',
  },
  {
    name: 'Airtable',
    slug: 'airtable',
    category: 'Platforms & CMS',
    aliases: ['Airtable automations', 'Airtable base'],
    sources: ['NICHE', 'COMP'],
    evidence: 'NICHE no-code-DB coverage · COMP: SMB ops gigs',
  },
  {
    name: 'Retool (internal tools)',
    slug: 'retool',
    category: 'Platforms & CMS',
    aliases: ['Retool', 'admin panel', 'internal tooling', 'Appsmith', 'Budibase'],
    sources: ['COMP', 'NICHE'],
    evidence:
      'COMP: dedicated hire pages on Upwork, Toptal AND Arc. Added 2026-09-20 — "build me an ' +
      'admin panel / internal dashboard over our database" is a high-frequency brief with no ' +
      'prior home in the taxonomy.',
  },
  {
    name: 'Bubble (no-code apps)',
    slug: 'bubble',
    category: 'Platforms & CMS',
    aliases: ['Bubble.io', 'FlutterFlow', 'Adalo', 'Softr'],
    sources: ['COMP', 'NICHE'],
    evidence: 'COMP: dedicated hire pages · NICHE low-code coverage; MVP builds',
  },

  // ──────────────────────────────── AI/ML (12) ──────────────────────────────────
  {
    name: 'LLM API integration',
    slug: 'llm-integration',
    category: 'AI/ML',
    aliases: ['AI integration', 'OpenAI API', 'Claude API', 'LLM wiring'],
    sources: ['UP26', 'GH25'],
    evidence:
      'UP26 "AI Integration" +178% YoY — the #1 growth skill inside Coding & Web Development · ' +
      'GH25 >1.1M public repos now use an LLM SDK',
  },
  {
    name: 'RAG pipelines',
    slug: 'rag',
    category: 'AI/ML',
    aliases: ['retrieval-augmented generation', 'document Q&A', 'knowledge base bot'],
    sources: ['NICHE', 'RM'],
    evidence: 'NICHE AI coverage · RM AI Agents roadmap; matches eval brief J3',
  },
  {
    name: 'Vector search & embeddings',
    slug: 'vector-search',
    category: 'AI/ML',
    aliases: ['pgvector', 'Pinecone', 'semantic search', 'HNSW'],
    sources: ['NICHE', 'STACK'],
    evidence: 'NICHE AI coverage · this project runs pgvector + HNSW; matches eval brief J3',
  },
  {
    name: 'Prompt engineering',
    slug: 'prompt-engineering',
    category: 'AI/ML',
    aliases: ['prompt design', 'system prompts'],
    sources: ['RM', 'JB25'],
    evidence: 'RM Prompt Engineering roadmap · JB25 AI adoption past the tipping point',
  },
  {
    name: 'AI agents',
    slug: 'ai-agents',
    category: 'AI/ML',
    aliases: ['MCP', 'tool use', 'agentic workflows', 'autonomous agents'],
    sources: ['RM', 'GH25'],
    evidence: 'RM AI Agents roadmap · GH25 agent-tooling repo growth; SO25 GitHub MCP at 43%',
  },
  {
    name: 'Chatbot development',
    slug: 'chatbots',
    category: 'AI/ML',
    aliases: ['conversational AI', 'support bot', 'customer service bot'],
    sources: ['UP26', 'COMP'],
    evidence: 'UP26 "AI Chatbot Development" +71% YoY within Coding & Web Development · COMP',
  },
  {
    name: 'LLM evals & guardrails',
    slug: 'llm-evals',
    category: 'AI/ML',
    aliases: ['evaluation harness', 'red-teaming', 'guardrails', 'hallucination testing'],
    sources: ['GH25', 'RM'],
    evidence:
      'GH25 eval-harness repo growth · RM AI Red Teaming roadmap. Renamed from "LLM evals" to ' +
      'include guardrails — clients buy the pair, and eval brief J3 asks for both.',
  },
  {
    name: 'Fine-tuning',
    slug: 'fine-tuning',
    category: 'AI/ML',
    aliases: ['LoRA', 'model tuning', 'adapter training'],
    sources: ['UP26', 'RM'],
    evidence: 'UP26 Generative AI Modeling +21% · RM AI roadmap',
  },
  {
    name: 'LangChain',
    slug: 'langchain',
    category: 'AI/ML',
    aliases: ['LlamaIndex', 'LLM orchestration'],
    sources: ['COMP', 'GH25'],
    evidence: 'COMP: named on AI-developer listings · GH25 orchestration-framework repo volume',
  },
  {
    name: 'Generative AI modeling',
    slug: 'genai-modeling',
    category: 'AI/ML',
    aliases: ['diffusion models', 'image generation', 'AI image editing'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 Generative AI Modeling +21% (Data Science); AI Image Generation & Editing +95% ' +
      'sits in Design & Creative, so only the build-side is in scope here',
  },
  {
    name: 'Speech & audio AI',
    slug: 'speech-ai',
    category: 'AI/ML',
    aliases: ['Whisper', 'text-to-speech', 'voice agents', 'transcription pipeline'],
    sources: ['UP26', 'COMP'],
    evidence: 'UP26 conversational-AI demand · COMP: voice-agent listings for support/sales',
  },
  {
    name: 'Computer vision & document AI',
    slug: 'computer-vision',
    category: 'AI/ML',
    aliases: ['OCR', 'document extraction', 'invoice parsing', 'image recognition'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 data-extraction / knowledge-representation demand (+31%) · COMP: dedicated hire ' +
      'pages. Added 2026-09-20 — "read these PDFs/invoices into our system" is a core ' +
      'automation brief and had no tag.',
  },

  // ─────────────────────────────── Practices (12) ───────────────────────────────
  {
    name: 'Automated testing',
    slug: 'testing',
    category: 'Practices',
    aliases: ['Vitest', 'Playwright', 'Cypress', 'Jest', 'test coverage', 'QA automation'],
    sources: ['SJS25', 'STACK'],
    evidence:
      'SJS25 tracks the testing category · this project gates CI on Vitest + Playwright. ' +
      '"Playwright" resolves here and ONLY here (see web-scraping).',
  },
  {
    name: 'Code review & quality',
    slug: 'code-review',
    category: 'Practices',
    aliases: ['refactoring', 'code audit', 'maintainability review'],
    sources: ['RM', 'COMP'],
    evidence: 'RM Code Review roadmap · COMP: a senior-freelance signal and a standalone gig type',
  },
  {
    name: 'Legacy modernization',
    slug: 'legacy-modernization',
    category: 'Practices',
    aliases: ['legacy code', 'framework upgrade', 'replatforming', 'version migration'],
    sources: ['SO25', 'COMP'],
    evidence:
      'SO25 shows the installed base that funds this work: jQuery 23.4%, AngularJS 7.2%, ' +
      'legacy ASP.NET 14.2% · COMP: "upgrade our old app" is a standing brief shape. ' +
      'Added 2026-09-20.',
  },
  {
    name: 'API design',
    slug: 'api-design',
    category: 'Practices',
    aliases: ['OpenAPI', 'Swagger', 'REST API design', 'API architecture', 'versioning'],
    sources: ['RM', 'COMP'],
    evidence:
      'RM API Design roadmap · COMP. Added 2026-09-20 and deliberately distinct from ' +
      'rest-api-integration: designing an API you own is a different sale from wiring up ' +
      'someone else’s.',
  },
  {
    name: 'Database design & optimization',
    slug: 'database-design',
    category: 'Practices',
    aliases: ['schema design', 'query optimization', 'indexing', 'slow query tuning'],
    sources: ['RM', 'COMP'],
    evidence:
      'RM SQL roadmap · COMP: "PostgreSQL management and optimization" appears verbatim in ' +
      'freelance skill lists. Added 2026-09-20 — eval brief J4 asks for MySQL tuning and the ' +
      'taxonomy could only express the product, not the skill.',
  },
  {
    name: 'Accessibility (a11y)',
    slug: 'accessibility',
    category: 'Practices',
    aliases: ['WCAG', 'ARIA', 'a11y audit', 'screen reader testing'],
    sources: ['RM', 'STACK'],
    evidence: 'RM frontend roadmap · this project gates on axe-core + WCAG AA',
  },
  {
    name: 'Web performance',
    slug: 'performance',
    category: 'Practices',
    aliases: ['Core Web Vitals', 'Lighthouse', 'page speed', 'LCP optimization'],
    sources: ['RM', 'STACK'],
    evidence: 'RM performance roadmap · this project gates on Lighthouse + CWV thresholds',
  },
  {
    name: 'Application security',
    slug: 'security',
    category: 'Practices',
    aliases: ['OWASP', 'API security', 'security audit', 'vulnerability fix'],
    sources: ['RM', 'COMP'],
    evidence: 'RM API Security roadmap · COMP: standalone audit gigs',
  },
  {
    name: 'Technical writing',
    slug: 'technical-writing',
    category: 'Practices',
    aliases: ['documentation', 'README', 'API documentation', 'developer docs'],
    sources: ['RM', 'COMP'],
    evidence: 'RM Technical Writer roadmap · COMP: a billable add-on, not just a nicety',
  },
  {
    name: 'Web & UX implementation',
    slug: 'web-ux-build',
    category: 'Practices',
    aliases: ['Figma to code', 'responsive design', 'pixel-perfect build', 'design handoff'],
    sources: ['UP26', 'COMP'],
    evidence:
      'UP26 web-design demand holds YoY · COMP. The dev-side phrasing of a buyer-side request; ' +
      'design tools themselves (Figma, Photoshop) stay out of the niche.',
  },
  {
    name: 'Developer SEO',
    slug: 'developer-seo',
    category: 'Practices',
    aliases: ['technical SEO', 'JSON-LD', 'structured data', 'sitemap', 'meta tags'],
    sources: ['COMP', 'STACK'],
    evidence:
      'COMP: a standard freelance add-on · this project ships JobPosting JSON-LD and treats ' +
      'it as the highest-leverage SEO item in the build',
  },
  {
    name: 'Git & GitHub workflow',
    slug: 'git-github',
    category: 'Practices',
    aliases: ['version control', 'pull requests', 'branching strategy'],
    sources: ['SO25', 'RM'],
    evidence: 'SO25 GitHub 66.9% and top desired collaboration tool · RM Git roadmap',
  },
];

/** Category order for the picker UI and for rolling filters up. */
export const skillCategoryOrder: SkillCategory[] = [
  'Languages',
  'Frontend',
  'Mobile',
  'Backend',
  'Data',
  'Cloud & DevOps',
  'Automation & integration',
  'Platforms & CMS',
  'AI/ML',
  'Practices',
];
