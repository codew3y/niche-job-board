import { formatRange } from '@/components/shared/money';
import { OG_SIZE, shareCard } from '@/lib/og/card';
import { AVAILABILITY_LABEL, getTalentBySlug } from '@techselect/backend/services/talent';

/** The share card for a developer profile link: headline, rate, availability, projects, skills. */
export const alt = 'A developer on TechSelect';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getTalentBySlug(slug);
  // An unpublished profile gets the plain brand card: the image must never reveal a draft.
  if (!p || !p.is_published) {
    return shareCard({
      kicker: 'Developer',
      title: 'Hire builders, not buzzwords.',
      facts: [],
      tags: [],
    });
  }
  const rate = formatRange(p.hourly_rate_min, p.hourly_rate_max, p.currency, '/hr');
  const projects =
    p.portfolio_item_count > 0
      ? `${p.portfolio_item_count} ${p.portfolio_item_count === 1 ? 'project' : 'projects'}`
      : null;
  return shareCard({
    kicker: 'Developer',
    title: p.headline,
    facts: [rate, AVAILABILITY_LABEL[p.availability] ?? p.availability, projects].filter(
      (f): f is string => Boolean(f),
    ),
    tags: (p.talent_skills ?? []).flatMap((s) => (s.skills?.name ? [s.skills.name] : [])),
  });
}
