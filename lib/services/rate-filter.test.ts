import { describe, expect, it } from 'vitest';

import { talentSearchParams } from '../schemas/search';
import { rateFilters } from './rate-filter';

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
