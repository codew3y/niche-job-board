import { describe, expect, it } from 'vitest';

import { formatRange } from './money';

/**
 * §7: entities and currencies must never be conflated. A bare "2,000–4,000" is ambiguous in
 * a way that changes whether someone applies, so the currency is always shown.
 */
describe('formatRange', () => {
  it('shows a full range with its currency', () => {
    expect(formatRange('2000', '4000', 'USD')).toBe('$2,000-$4,000');
    expect(formatRange('2000', '4000', 'EUR')).toBe('€2,000-€4,000');
    expect(formatRange('2000', '4000', 'CHF')).toContain('2,000');
  });

  it('never renders a bare number without a currency marker', () => {
    for (const c of ['USD', 'EUR', 'GBP', 'CHF']) {
      const out = formatRange('50', '90', c, '/hr')!;
      expect(out).not.toMatch(/^\d/);
    }
  });

  it('handles an open-ended range in both directions', () => {
    expect(formatRange('2000', null, 'USD')).toBe('From $2,000');
    expect(formatRange(null, '4000', 'USD')).toBe('Up to $4,000');
  });

  it('returns null when there is no budget at all, so the caller can omit the field', () => {
    expect(formatRange(null, null, 'USD')).toBeNull();
    expect(formatRange('', '', 'USD')).toBeNull();
  });

  it('appends the unit suffix for hourly work', () => {
    expect(formatRange('50', '90', 'USD', '/hr')).toBe('$50-$90/hr');
  });

  it('drops fractional pence — budgets are not priced to the cent', () => {
    expect(formatRange('1999.99', '4000.49', 'USD')).toBe('$2,000-$4,000');
  });
});
