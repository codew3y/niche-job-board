/**
 * Sample content for the prototypes — shaped like the real product, labelled as sample in
 * the UI. None of these numbers describe the live service: TechSelect publishes no totals it
 * cannot back, and a prototype is not a licence to start.
 */

export const MATCHES = [
  {
    title: 'Rebuild subscription billing on Stripe',
    company: 'Northwind Analytics',
    meta: 'Remote · Fixed price',
    budget: '$6,000–$9,000',
    score: 94,
    reason:
      'Has shipped this exact migration twice — Stripe Billing with proration and a historical-invoice backfill — and names the reconciliation job that makes it safe.',
    skills: ['Stripe', 'Postgres', 'TypeScript'],
  },
  {
    title: 'n8n workflows for a CRM-to-invoicing sync',
    company: 'Alder & Finch',
    meta: 'Remote · Hourly',
    budget: '$70–$95/hr',
    score: 81,
    reason:
      'Built HubSpot → Xero automation with retry and dead-letter handling; the brief’s "no silent failures" requirement is what their last project was about.',
    skills: ['n8n', 'HubSpot', 'Webhooks'],
  },
  {
    title: 'Headless WooCommerce storefront in Next.js',
    company: 'Kettle Street Coffee',
    meta: 'Hybrid — Zurich · Fixed price',
    budget: '$4,500–$7,000',
    score: 72,
    reason:
      'Strong Next.js commerce work, but no WooCommerce REST experience shown — the storefront half fits better than the integration half.',
    skills: ['Next.js', 'WooCommerce', 'Vercel'],
  },
] as const;

export const PROFILE = {
  name: 'Sam',
  headline: 'Payments and Postgres developer for subscription businesses',
  strength: [
    { label: 'Headline and bio', done: true },
    { label: 'Skills and rates', done: true },
    { label: 'Two projects or a portfolio site', done: true },
    { label: 'An outcome with a number in it', done: false },
  ],
  stats: { applications: 4, shortlisted: 1, saved: 7, unread: 2 },
};

export const ACTIVITY = [
  { text: 'Northwind Analytics shortlisted your application', when: '2h ago' },
  { text: 'New message from Alder & Finch', when: 'Yesterday' },
  { text: 'You saved “Headless WooCommerce storefront”', when: 'Mon' },
];
