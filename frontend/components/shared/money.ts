/**
 * Budget and rate formatting.
 *
 * The currency is always shown. This project spans CHF, EUR, GBP and USD, and §7 is explicit
 * that entities and currencies must never be conflated — a bare "2,000–4,000" is ambiguous
 * in a way that matters to someone deciding whether to apply.
 *
 * Ranges use a plain hyphen, never an en dash: the copy rules ban both dash characters from
 * anything a visitor reads.
 */
export function formatRange(
  min: string | number | null,
  max: string | number | null,
  currency: string,
  suffix = '',
): string | null {
  const lo = min === null || min === '' ? null : Number(min);
  const hi = max === null || max === '' ? null : Number(max);
  if (lo === null && hi === null) return null;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(n);

  if (lo !== null && hi !== null) return `${fmt(lo)}-${fmt(hi)}${suffix}`;
  if (lo !== null) return `From ${fmt(lo)}${suffix}`;
  return `Up to ${fmt(hi!)}${suffix}`;
}

export const ENGAGEMENT_LABEL: Record<string, string> = {
  fixed: 'Fixed price',
  hourly: 'Hourly',
  retainer: 'Retainer',
};

export const LOCATION_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'Onsite',
};
