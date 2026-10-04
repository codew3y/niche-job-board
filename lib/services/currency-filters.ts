/**
 * Money comparisons in Browse, as the PostgREST `or` expressions listTalent and listJobs apply:
 * the developer rate filter and the job budget sort and filters.
 *
 * ONE RULE FOR BOTH: money is only compared within one currency. Rates and budgets are stored in
 * the currency their author chose, and comparing the raw numbers across currencies ranks 6,000
 * CHF, 6,000 GBP and 6,000 USD as equal.
 *
 * RATES (developers)
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

/** The currency a comparison runs in: the chosen one, or USD for an old link without one. */
const inCurrency = (currency?: RateCurrency) => currency ?? DEFAULT_RATE_CURRENCY;

export function rateFilters({
  rateMin,
  rateMax,
  currency,
}: {
  rateMin?: number;
  rateMax?: number;
  currency?: RateCurrency;
}): string[] {
  const cur = inCurrency(currency);
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

/**
 * BUDGETS (jobs). "Highest budget", "Lowest budget" and the budget range filters compare within
 * one currency. While any of them is in play, the list is scoped to jobs budgeted in that
 * currency, plus jobs with no budget at all (which the sorts already put last: an unstated
 * budget is an unknown, not the cheapest). Jobs budgeted in another currency are left out of
 * that view rather than misplaced; the Browse filter says so in words beside the control.
 *
 * The plain "Newest first" list is untouched: it compares no money, so it shows every job.
 */
export function budgetInPlay(p: { sort?: string; budgetMin?: number; budgetMax?: number }) {
  return (
    p.sort === 'budget_high' ||
    p.sort === 'budget_low' ||
    p.budgetMin !== undefined ||
    p.budgetMax !== undefined
  );
}

export function budgetFilters(p: {
  sort?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: RateCurrency;
}): string[] {
  if (!budgetInPlay(p)) return [];
  const cur = inCurrency(p.currency);
  // Each entry is ANDed with the rest of the query by listJobs (one `.or()` call each).
  const out = [`currency.eq.${cur},and(budget_min.is.null,budget_max.is.null)`];
  // Overlap, not containment: a 3-5k job matches a "4k+" search.
  if (p.budgetMin !== undefined) out.push(`budget_max.gte.${p.budgetMin},budget_max.is.null`);
  if (p.budgetMax !== undefined) out.push(`budget_min.lte.${p.budgetMax},budget_min.is.null`);
  return out;
}
