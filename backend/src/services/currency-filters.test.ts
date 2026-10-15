import { describe, expect, it } from 'vitest';

import { jobSearchParams, talentSearchParams } from '../schemas/search';
import { budgetFilters, budgetInPlay, rateFilters } from './currency-filters';

describe('the Browse rate filter compares within one currency', () => {
  it('pins the currency on the rate comparison, and keeps profiles with no rate', () => {
    expect(rateFilters({ rateMax: 75, currency: 'EUR' })).toEqual([
      'and(currency.eq.EUR,hourly_rate_min.lte.75),hourly_rate_min.is.null',
    ]);
  });

  it('reads a rate with no currency (an old link) as USD', () => {
    expect(rateFilters({ rateMax: 40 })).toEqual([
      'and(currency.eq.USD,hourly_rate_min.lte.40),hourly_rate_min.is.null',
    ]);
  });

  it('applies the floor the same way', () => {
    expect(rateFilters({ rateMin: 50, currency: 'CHF' })).toEqual([
      'and(currency.eq.CHF,hourly_rate_max.gte.50),hourly_rate_max.is.null',
    ]);
  });

  it('adds nothing without a rate: choosing a currency alone filters no one', () => {
    expect(rateFilters({ currency: 'GBP' })).toEqual([]);
  });
});

describe('the currency param', () => {
  it('accepts the four supported currencies', () => {
    expect(talentSearchParams.parse({ rateMax: '75', currency: 'GBP' }).currency).toBe('GBP');
  });

  it('DROPS an unknown currency instead of failing the parse, which would clear every filter', () => {
    const parsed = talentSearchParams.safeParse({ rateMax: '75', currency: 'JPY),x.eq.1' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.currency).toBeUndefined();
    expect(parsed.data?.rateMax).toBe(75);
  });
});

describe('the job budget sort and filters compare within one currency', () => {
  const SCOPE = (c: string) => `currency.eq.${c},and(budget_min.is.null,budget_max.is.null)`;

  it('leaves "Newest first" alone: it compares no money, so every job shows', () => {
    expect(budgetInPlay({ sort: 'recent' })).toBe(false);
    expect(budgetFilters({ sort: 'recent', currency: 'EUR' })).toEqual([]);
  });

  it('scopes a budget sort to one currency, keeping jobs with no budget', () => {
    expect(budgetFilters({ sort: 'budget_high', currency: 'CHF' })).toEqual([SCOPE('CHF')]);
    expect(budgetFilters({ sort: 'budget_low' })).toEqual([SCOPE('USD')]);
  });

  it('scopes the budget range filters the same way, overlap rather than containment', () => {
    expect(budgetFilters({ budgetMin: 4000, budgetMax: 9000, currency: 'GBP' })).toEqual([
      SCOPE('GBP'),
      'budget_max.gte.4000,budget_max.is.null',
      'budget_min.lte.9000,budget_min.is.null',
    ]);
  });

  it('parses the currency for jobs too, dropping an unknown one', () => {
    expect(jobSearchParams.parse({ sort: 'budget_high', currency: 'EUR' }).currency).toBe('EUR');
    const parsed = jobSearchParams.safeParse({ sort: 'budget_high', currency: 'XYZ' });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.currency).toBeUndefined();
    expect(parsed.data?.sort).toBe('budget_high');
  });
});
