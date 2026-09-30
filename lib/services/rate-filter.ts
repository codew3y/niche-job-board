/**
 * The Browse rate filter, as the PostgREST `or` expressions listTalent applies.
 *
 * WHY A CURRENCY. Rates are stored in the currency each developer chose (USD, EUR, GBP, CHF),
 * and "Up to 75/hr" used to compare the raw numbers: 75 CHF, 75 GBP and 75 USD all counted as
 * equal, so a developer could be shown or hidden on the strength of a number that meant
 * something different. The filter now applies within ONE currency: "up to 75 EUR/hr" matches
 * developers who charge in euros at or under 75. Developers who charge in another currency are
 * not compared at all. There is no conversion, deliberately: it would need a live exchange-rate
 * source, and a stale rate would quietly misplace people.
 *
 * Profiles with no rate stay in the results under any rate filter, as before: an unstated rate
 * is an unknown, not a price, and hiding it would punish people for not typing a number.
 *
 * A rate with no currency (an old /browse?rateMax=75 link) is read as USD, the product's
 * default currency, and the filter UI shows USD selected so the assumption is visible.
 *
 * Pure (no server-only imports) so it is unit-tested directly.
 */
export const RATE_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF'] as const;
export type RateCurrency = (typeof RATE_CURRENCIES)[number];
export const DEFAULT_RATE_CURRENCY: RateCurrency = 'USD';

export function rateFilters({
  rateMin,
  rateMax,
  currency,
}: {
  rateMin?: number;
  rateMax?: number;
  currency?: RateCurrency;
}): string[] {
  const cur = currency ?? DEFAULT_RATE_CURRENCY;
  const out: string[] = [];
  // Each entry is ANDed with the rest of the query by listTalent (one `.or()` call each).
  if (rateMin !== undefined) {
    out.push(`and(currency.eq.${cur},hourly_rate_max.gte.${rateMin}),hourly_rate_max.is.null`);
  }
  if (rateMax !== undefined) {
    out.push(`and(currency.eq.${cur},hourly_rate_min.lte.${rateMax}),hourly_rate_min.is.null`);
  }
  return out;
}
