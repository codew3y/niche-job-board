import { ENGAGEMENT_LABEL, formatRange } from '@/components/shared/money';
import { OG_SIZE, shareCard } from '@/lib/og/card';
import { getJobBySlug } from '@techselect/backend/services/jobs';

/** The share card for a job link: title, budget, engagement, client and the required skills. */
export const alt = 'A brief on TechSelect';
export const size = OG_SIZE;
export const contentType = 'image/png';

type Job = {
  title: string;
  status: string;
  engagement_type: string;
  budget_min: string | null;
  budget_max: string | null;
  currency: string;
  client_profiles: { company_name: string } | null;
  job_skills: { is_required: boolean; skills: { name: string } | null }[];
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = (await getJobBySlug(slug)) as Job | null;
  // A draft or a missing job gets the plain brand card: the image must never reveal a draft.
  if (!job || job.status === 'draft') {
    return shareCard({
      kicker: 'Brief',
      title: 'Software, web and automation work',
      facts: [],
      tags: [],
    });
  }
  const budget = formatRange(
    job.budget_min,
    job.budget_max,
    job.currency,
    job.engagement_type === 'hourly' ? '/hr' : '',
  );
  return shareCard({
    kicker: job.status === 'open' ? 'Open brief' : 'Brief',
    title: job.title,
    facts: [
      budget,
      ENGAGEMENT_LABEL[job.engagement_type] ?? job.engagement_type,
      job.client_profiles?.company_name,
    ].filter((f): f is string => Boolean(f)),
    tags: [...job.job_skills]
      .sort((a, b) => Number(b.is_required) - Number(a.is_required))
      .flatMap((s) => (s.skills?.name ? [s.skills.name] : [])),
  });
}
