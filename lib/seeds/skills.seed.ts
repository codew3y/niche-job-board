// Skill taxonomy seed — Phase 0 deliverable per PROJECT.md §4.6.3
// 105 skills across 9 categories. Feeds the Phase 1 seed script directly.
// Fields: name (canonical) · slug (unique) · category · aliases[] · source
// Review cadence: annually; prune zero-use after 12mo; promote ≥3 "request a skill" repeats.
// See docs/taxonomy.md for sources, granularity rule, exclusions.

export type SkillSeed = {
  name: string;
  slug: string;
  category:
    | 'Languages'
    | 'Frontend'
    | 'Backend'
    | 'Data'
    | 'Cloud & DevOps'
    | 'Automation & integration'
    | 'Platforms & CMS'
    | 'AI/ML'
    | 'Practices';
  aliases: string[];
  source: string;
};

export const skillsSeed: SkillSeed[] = [
  // ── Languages (14) ──
  { name: 'JavaScript', slug: 'javascript', category: 'Languages', aliases: ['JS', 'ES2023+'], source: 'SO25 top-3 · GH25 #3 · JB25 plateau' },
  { name: 'TypeScript', slug: 'typescript', category: 'Languages', aliases: ['TS', 'TS strict'], source: 'GH25 #1 +67% YoY · JB25 highest growth' },
  { name: 'Python', slug: 'python', category: 'Languages', aliases: ['Python 3', 'py'], source: 'SO25 +7pp · GH25 #2' },
  { name: 'PHP', slug: 'php', category: 'Languages', aliases: ['PHP 8'], source: 'JB25 declining but freelance volume via Laravel/WP' },
  { name: 'Ruby', slug: 'ruby', category: 'Languages', aliases: ['rb'], source: 'JB25 declining · Rails niche persists · RM' },
  { name: 'Java', slug: 'java', category: 'Languages', aliases: ['JVM', 'Java 21'], source: 'GH25 top-5 · enterprise anchor · RM' },
  { name: 'C#', slug: 'csharp', category: 'Languages', aliases: ['C-Sharp', '.NET language'], source: 'GH25 top-6 steady · RM ASP.NET Core' },
  { name: 'Go', slug: 'go', category: 'Languages', aliases: ['Golang'], source: 'JB25 most-wanted-next 11% · IaC/cloud staple' },
  { name: 'Rust', slug: 'rust', category: 'Languages', aliases: ['rs'], source: 'SO25 most-admired 72% · JB25 promise-index top-3' },
  { name: 'Kotlin', slug: 'kotlin', category: 'Languages', aliases: ['kt'], source: 'JB25 ascent · Android/backend' },
  { name: 'Swift', slug: 'swift', category: 'Languages', aliases: ['SwiftUI', 'iOS'], source: 'RM Swift/SwiftUI · UP25 mobile' },
  { name: 'Dart', slug: 'dart', category: 'Languages', aliases: ['Flutter SDK'], source: 'RM Flutter · UP25 mobile' },
  { name: 'SQL', slug: 'sql', category: 'Languages', aliases: ['ANSI SQL', 'queries'], source: 'JB25 plateau · RM SQL · universal filter skill' },
  { name: 'Bash / Shell', slug: 'bash', category: 'Languages', aliases: ['Shell', 'sh', 'scripting'], source: 'GH25 Shell +324% in AI repos · RM Bash' },

  // ── Frontend (14) ──
  { name: 'React', slug: 'react', category: 'Frontend', aliases: ['React.js', 'ReactJS'], source: 'SJS24 #1 usage · Toptal hot' },
  { name: 'Next.js', slug: 'nextjs', category: 'Frontend', aliases: ['Next', 'Next.js 15'], source: 'SJS24 dominant meta-framework' },
  { name: 'Vue.js', slug: 'vue', category: 'Frontend', aliases: ['Vue', 'Nuxt'], source: 'SJS24 #2 · RM Vue' },
  { name: 'Angular', slug: 'angular', category: 'Frontend', aliases: ['ng', 'Angular 18+'], source: 'SJS24 top-3 · RM · enterprise freelance' },
  { name: 'Svelte', slug: 'svelte', category: 'Frontend', aliases: ['SvelteKit', 'Svelte 5'], source: 'SJS24 highest positive sentiment' },
  { name: 'Astro', slug: 'astro', category: 'Frontend', aliases: ['Astro.js', 'islands'], source: 'GH25 +78% YoY · SJS24 high retention' },
  { name: 'React Native', slug: 'react-native', category: 'Frontend', aliases: ['RN', 'Expo'], source: 'UP25 mobile #4 · RM · COMP staple' },
  { name: 'Flutter', slug: 'flutter', category: 'Frontend', aliases: ['Dart UI'], source: 'RM Flutter · UP25 mobile' },
  { name: 'Tailwind CSS', slug: 'tailwind', category: 'Frontend', aliases: ['TailwindCSS', 'utility-first'], source: 'SCS24 #1 framework by far' },
  { name: 'Bootstrap', slug: 'bootstrap', category: 'Frontend', aliases: ['BS5'], source: 'SCS24 #2 · legacy maintenance staple' },
  { name: 'Sass', slug: 'sass', category: 'Frontend', aliases: ['SCSS', 'Sass/SCSS'], source: 'SCS24 67% preprocessor leader' },
  { name: 'shadcn/ui', slug: 'shadcn-ui', category: 'Frontend', aliases: ['shadcn', 'Radix UI'], source: 'Project stack · Tailwind-ecosystem standard' },
  { name: 'Vite', slug: 'vite', category: 'Frontend', aliases: ['vitejs', 'HMR builds'], source: 'SJS24 most-loved 56% + most-adopted' },
  { name: 'HTML / CSS', slug: 'html-css', category: 'Frontend', aliases: ['HTML5', 'CSS3', 'responsive markup'], source: 'RM foundations · UP25 web design' },

  // ── Backend (10) ──
  { name: 'Node.js', slug: 'nodejs', category: 'Backend', aliases: ['Node', 'Bun', 'Deno'], source: 'SO25 upskilling path · Toptal hot · RM' },
  { name: 'Express.js', slug: 'express', category: 'Backend', aliases: ['Express', 'REST API'], source: 'SO25 Node staple · RM backend' },
  { name: 'NestJS', slug: 'nestjs', category: 'Backend', aliases: ['Nest', 'enterprise Node'], source: 'RM backend · senior-Node vocabulary' },
  { name: 'Django', slug: 'django', category: 'Backend', aliases: ['Django REST', 'DRF'], source: 'RM Django · SO25 Python strength' },
  { name: 'Flask', slug: 'flask', category: 'Backend', aliases: ['Jinja', 'WSGI'], source: 'SO25 Python · microservice staple' },
  { name: 'FastAPI', slug: 'fastapi', category: 'Backend', aliases: ['Pydantic', 'async Python'], source: 'SO25 +5pts biggest framework mover' },
  { name: 'Laravel', slug: 'laravel', category: 'Backend', aliases: ['Blade', 'Eloquent'], source: 'GH25 Blade +67% · RM Laravel' },
  { name: 'Ruby on Rails', slug: 'rails', category: 'Backend', aliases: ['RoR', 'Hotwire'], source: 'Wellfound filter · COMP pickers · MVP gigs' },
  { name: 'ASP.NET Core', slug: 'aspnet-core', category: 'Backend', aliases: ['.NET', 'C# backend'], source: 'RM ASP.NET Core · GH25 C# steady' },
  { name: 'Spring Boot', slug: 'spring-boot', category: 'Backend', aliases: ['Spring', 'Java backend'], source: 'RM Spring Boot · enterprise Java' },

  // ── Data (10) ──
  { name: 'PostgreSQL', slug: 'postgresql', category: 'Data', aliases: ['Postgres', 'Neon'], source: 'SO25 most-admired+desired · RM' },
  { name: 'MySQL', slug: 'mysql', category: 'Data', aliases: ['MariaDB', 'PlanetScale'], source: 'SO25 top-used relational · WP/Laravel default' },
  { name: 'SQLite', slug: 'sqlite', category: 'Data', aliases: ['Turso', 'local-first DB'], source: 'Indie/local-first vocabulary · zero-ops gigs' },
  { name: 'MongoDB', slug: 'mongodb', category: 'Data', aliases: ['Mongoose', 'NoSQL docs'], source: 'SO25 upskilling path · RM · COMP' },
  { name: 'Redis', slug: 'redis', category: 'Data', aliases: ['caching', 'queues'], source: 'SO25 +8% · 43% top AI-agent store · RM' },
  { name: 'Supabase', slug: 'supabase', category: 'Data', aliases: ['Postgres BaaS', 'Auth+Storage'], source: 'Project stack · freelance-BaaS vocabulary' },
  { name: 'Firebase', slug: 'firebase', category: 'Data', aliases: ['Firestore', 'FCM'], source: 'COMP pickers · BaaS alternative' },
  { name: 'Elasticsearch', slug: 'elasticsearch', category: 'Data', aliases: ['OpenSearch', 'full-text search'], source: 'RM Elasticsearch · search-feature gigs' },
  { name: 'BigQuery', slug: 'bigquery', category: 'Data', aliases: ['data warehouse', 'analytics SQL'], source: 'PROJECT.md §4.6.4 example · UP25 analytics' },
  { name: 'Prisma', slug: 'prisma', category: 'Data', aliases: ['Prisma.js', 'Drizzle ORM'], source: 'TS-ORM standard · pairs with Drizzle stack' },

  // ── Cloud & DevOps (11) ──
  { name: 'AWS', slug: 'aws', category: 'Cloud & DevOps', aliases: ['EC2', 'S3', 'IAM'], source: 'SO25/JB25 default cloud · RM AWS' },
  { name: 'Google Cloud', slug: 'gcp', category: 'Cloud & DevOps', aliases: ['GCP', 'Cloud Run'], source: 'SO25 major platform · RM cloud' },
  { name: 'Microsoft Azure', slug: 'azure', category: 'Cloud & DevOps', aliases: ['Entra ID', 'App Service'], source: 'SO25 major platform · enterprise' },
  { name: 'Vercel', slug: 'vercel', category: 'Cloud & DevOps', aliases: ['Netlify', 'Jamstack hosting'], source: 'Project stack · freelance-deploy vocabulary' },
  { name: 'Cloudflare', slug: 'cloudflare', category: 'Cloud & DevOps', aliases: ['Workers', 'R2', 'CDN'], source: 'RM Cloudflare · edge/DNS/perf gigs' },
  { name: 'Docker', slug: 'docker', category: 'Cloud & DevOps', aliases: ['containers', 'Compose'], source: 'SO25 +17pts largest jump · RM Docker' },
  { name: 'Kubernetes', slug: 'kubernetes', category: 'Cloud & DevOps', aliases: ['K8s', 'Helm'], source: 'RM DevOps/K8s core' },
  { name: 'Terraform', slug: 'terraform', category: 'Cloud & DevOps', aliases: ['IaC', 'HCL'], source: 'GH25 HCL +25% · RM Terraform' },
  { name: 'GitHub Actions', slug: 'github-actions', category: 'Cloud & DevOps', aliases: ['CI/CD', 'GitLab CI'], source: 'PROJECT.md §4.6.4 example · RM DevOps' },
  { name: 'Linux server admin', slug: 'linux-admin', category: 'Cloud & DevOps', aliases: ['VPS', 'Ubuntu', 'nginx'], source: 'RM Linux/Bash · host-harden-maintain gigs' },
  { name: 'Serverless functions', slug: 'serverless', category: 'Cloud & DevOps', aliases: ['AWS Lambda', 'edge functions'], source: 'Contra/Toptal rate-card vocabulary' },

  // ── Automation & integration (16) ──
  { name: 'Zapier', slug: 'zapier', category: 'Automation & integration', aliases: ['Zaps', 'automation'], source: '§4.6.1 iPaaS deliberate · COMP staple' },
  { name: 'Make', slug: 'make', category: 'Automation & integration', aliases: ['Integromat', 'scenarios'], source: '§4.6.1 iPaaS deliberate · freelancer vocabulary' },
  { name: 'n8n', slug: 'n8n', category: 'Automation & integration', aliases: ['self-hosted automation', 'workflows'], source: '§4.6.1 iPaaS deliberate · dev-favorite' },
  { name: 'Power Automate', slug: 'power-automate', category: 'Automation & integration', aliases: ['Flow', 'M365 automation'], source: '§4.6.1 iPaaS deliberate · enterprise/M365' },
  { name: 'Workato', slug: 'workato', category: 'Automation & integration', aliases: ['enterprise iPaaS', 'recipes'], source: '§4.6.1 iPaaS deliberate · enterprise gigs' },
  { name: 'Tray.ai', slug: 'tray-ai', category: 'Automation & integration', aliases: ['Tray.io', 'low-code integration'], source: '§4.6.1 iPaaS deliberate · connector gigs' },
  { name: 'REST API integration', slug: 'rest-apis', category: 'Automation & integration', aliases: ['REST', 'third-party APIs'], source: 'UP25 scripting/automation · RM API Design' },
  { name: 'GraphQL', slug: 'graphql', category: 'Automation & integration', aliases: ['Apollo', 'Relay'], source: 'RM GraphQL · API-freelance vocabulary' },
  { name: 'Webhooks', slug: 'webhooks', category: 'Automation & integration', aliases: ['event callbacks', 'inbound webhooks'], source: '§4.6.1 concepts · project stack /api/webhooks' },
  { name: 'OAuth & identity flows', slug: 'oauth', category: 'Automation & integration', aliases: ['OAuth2', 'OIDC', 'SSO'], source: '§4.6.1 concepts · SaaS integration requirement' },
  { name: 'ETL / data pipelines', slug: 'etl', category: 'Automation & integration', aliases: ['data extraction', 'Airbyte'], source: 'UP25 data-extraction · §4.6.1 concepts' },
  { name: 'Queues & background jobs', slug: 'queues', category: 'Automation & integration', aliases: ['RabbitMQ', 'SQS', 'BullMQ'], source: '§4.6.1 concepts · async/reliability gigs' },
  { name: 'Cron & scheduling', slug: 'cron', category: 'Automation & integration', aliases: ['pg_cron', 'scheduled tasks'], source: 'Project stack pg_cron · sync gigs' },
  { name: 'Web scraping', slug: 'web-scraping', category: 'Automation & integration', aliases: ['Puppeteer', 'Playwright'], source: 'Freelance staple · pairs with ETL' },
  { name: 'RPA (UiPath)', slug: 'rpa-uipath', category: 'Automation & integration', aliases: ['UiPath', 'Automation Anywhere'], source: '§4.6.1 RPA deliberate · enterprise back-office' },
  { name: 'Payment integration', slug: 'stripe', category: 'Automation & integration', aliases: ['Stripe', 'PayPal', 'checkout'], source: 'UP25 e-commerce #6 · freelance staple' },

  // ── Platforms & CMS (10) ──
  { name: 'WordPress', slug: 'wordpress', category: 'Platforms & CMS', aliases: ['WP', 'WooCommerce'], source: 'RM WordPress · UP25 CMS top-10' },
  { name: 'Shopify', slug: 'shopify', category: 'Platforms & CMS', aliases: ['Liquid', 'Polaris'], source: 'Buyer phrase Shopify app · UP25 e-commerce' },
  { name: 'Webflow', slug: 'webflow', category: 'Platforms & CMS', aliases: ['Framer', 'visual builder'], source: 'PROJECT.md §4.6.4 example · handoff gigs' },
  { name: 'Wix / Squarespace', slug: 'wix-squarespace', category: 'Platforms & CMS', aliases: ['Squarespace', 'site builders'], source: 'SMB freelance staple · COMP pickers' },
  { name: 'Headless CMS', slug: 'headless-cms', category: 'Platforms & CMS', aliases: ['Strapi', 'Sanity', 'Contentful'], source: 'Modern content gigs · pairs Next.js/Astro' },
  { name: 'Salesforce', slug: 'salesforce', category: 'Platforms & CMS', aliases: ['Apex', 'SOQL', 'Flows'], source: '§4.6.1 CRM deliberate · COMP enterprise' },
  { name: 'Zoho', slug: 'zoho', category: 'Platforms & CMS', aliases: ['Deluge', 'Zoho CRM'], source: '§4.6.1 CRM deliberate · PROJECT.md example' },
  { name: 'HubSpot', slug: 'hubspot', category: 'Platforms & CMS', aliases: ['HubSpot API', 'workflows'], source: '§4.6.1 CRM deliberate · CRM-automation gigs' },
  { name: 'Airtable', slug: 'airtable', category: 'Platforms & CMS', aliases: ['Bases', 'Automations'], source: 'No-code-DB vocabulary · SMB/ops gigs' },
  { name: 'Bubble (no-code apps)', slug: 'bubble', category: 'Platforms & CMS', aliases: ['FlutterFlow', 'Adalo'], source: 'Freelance no-code-app vocabulary · MVP gigs' },

  // ── AI/ML (11) ──
  { name: 'LLM API integration', slug: 'llm-integration', category: 'AI/ML', aliases: ['OpenAI API', 'Claude API'], source: '§4.6.1 AI deliberate · JB25 85% AI-tool use' },
  { name: 'RAG pipelines', slug: 'rag', category: 'AI/ML', aliases: ['retrieval-augmented', 'knowledge graphs'], source: '§4.6.1 AI deliberate · PROJECT.md example' },
  { name: 'Vector search & embeddings', slug: 'vector-search', category: 'AI/ML', aliases: ['pgvector', 'Pinecone'], source: 'PROJECT.md example · project stack pgvector+HNSW' },
  { name: 'Prompt engineering', slug: 'prompt-engineering', category: 'AI/ML', aliases: ['prompt design', 'system prompts'], source: 'RM Prompt Engineering · PROJECT.md example' },
  { name: 'AI agents', slug: 'ai-agents', category: 'AI/ML', aliases: ['MCP', 'tool use', 'autonomy'], source: 'SO25 agent-tooling · RM AI Agents' },
  { name: 'Fine-tuning', slug: 'fine-tuning', category: 'AI/ML', aliases: ['LoRA', 'model tuning'], source: 'PROJECT.md example · UP25 gen-modeling premium' },
  { name: 'LLM evals', slug: 'llm-evals', category: 'AI/ML', aliases: ['evaluation harnesses', 'red-teaming'], source: 'GH25 eval-harness growth · RM AI Red Teaming' },
  { name: 'Chatbot development', slug: 'chatbots', category: 'AI/ML', aliases: ['conversational AI', 'support bots'], source: 'UP25 conversational-AI demand · SMB bot gigs' },
  { name: 'LangChain', slug: 'langchain', category: 'AI/ML', aliases: ['LlamaIndex', 'orchestration'], source: 'Agent-framework vocabulary · COMP listings' },
  { name: 'Generative AI modeling', slug: 'genai-modeling', category: 'AI/ML', aliases: ['diffusion', 'image generation'], source: 'UP25 fastest-growing AI skill +22% premium' },
  { name: 'Speech & audio AI', slug: 'speech-ai', category: 'AI/ML', aliases: ['Whisper', 'TTS', 'voice agents'], source: 'Voice-agent gigs · support/sales automation' },

  // ── Practices (9) ──
  { name: 'Automated testing', slug: 'testing', category: 'Practices', aliases: ['Vitest', 'Playwright', 'manual QA'], source: 'SJS24 Vitest +26% · UP25 testing #10' },
  { name: 'Code review & quality', slug: 'code-review', category: 'Practices', aliases: ['refactoring', 'maintainability'], source: 'RM Code Review · senior-freelance signal' },
  { name: 'Accessibility (a11y)', slug: 'accessibility', category: 'Practices', aliases: ['WCAG', 'ARIA', 'a11y audits'], source: 'PROJECT.md example · DoD gates' },
  { name: 'Web performance', slug: 'performance', category: 'Practices', aliases: ['Core Web Vitals', 'Lighthouse'], source: 'PROJECT.md example · RM perf · DoD gates' },
  { name: 'Application security', slug: 'security', category: 'Practices', aliases: ['OWASP', 'API security'], source: 'PROJECT.md example · RM API Security' },
  { name: 'Technical writing', slug: 'technical-writing', category: 'Practices', aliases: ['docs', 'README', 'API docs'], source: 'PROJECT.md example · RM Technical Writer' },
  { name: 'Web & UX implementation', slug: 'web-ux-build', category: 'Practices', aliases: ['Figma-to-code', 'responsive design'], source: 'UP25 web/UX fastest-growing · dev-side phrase' },
  { name: 'Developer SEO', slug: 'developer-seo', category: 'Practices', aliases: ['JSON-LD', 'meta/OG', 'sitemaps'], source: 'Project stack JobPosting JSON-LD · freelance add-on' },
  { name: 'Git & GitHub workflow', slug: 'git-github', category: 'Practices', aliases: ['version control', 'PRs'], source: 'RM Git · SO25 GitHub MCP 43% · baseline skill' },
];
