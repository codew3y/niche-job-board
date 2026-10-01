import { SelectField } from '@/components/ui/field';
import { COMMON_CURRENCIES, CURRENCIES } from '@/lib/currencies';

const NAME = new Map(CURRENCIES);

/**
 * The currency for an hourly rate: every currency in circulation (lib/currencies.ts), with the
 * four the product has always offered first, then the rest A to Z. A native <select>, so a phone
 * opens its own picker, and typing the code's first letters jumps to it on a desktop.
 *
 * Options read "CHF · Swiss Franc": the code first, because it is what the rate is shown with.
 */
export function CurrencySelect({
  defaultValue,
  name = 'currency',
  label = 'Currency',
}: {
  defaultValue?: string;
  name?: string;
  label?: string;
}) {
  const common = new Set<string>(COMMON_CURRENCIES);
  return (
    <SelectField label={label} name={name} defaultValue={defaultValue || 'USD'}>
      <optgroup label="Common">
        {COMMON_CURRENCIES.map((code) => (
          <option key={code} value={code}>
            {code} · {NAME.get(code) ?? code}
          </option>
        ))}
      </optgroup>
      <optgroup label="All currencies">
        {CURRENCIES.filter(([code]) => !common.has(code)).map(([code, currencyName]) => (
          <option key={code} value={code}>
            {code} · {currencyName}
          </option>
        ))}
      </optgroup>
    </SelectField>
  );
}
