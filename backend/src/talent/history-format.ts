/**
 * "2024-03-01" → "Mar 2024". Parsed by hand rather than through `new Date()`, which reads a
 * bare date as UTC midnight and shows the previous month to anyone west of Greenwich.
 */
export function formatMonth(isoDate: string): string {
  const [year, month] = isoDate.split('-');
  const names = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const name = names[Number(month) - 1];
  return name && year ? `${name} ${year}` : isoDate;
}

/**
 * A certification's dates as one line, and whether it has lapsed: "Issued Mar 2024, expires
 * Mar 2027", or "Issued Mar 2021, expired Mar 2024". An expired certification is shown as
 * expired, never hidden: it is still true that the person earned it.
 *
 * Compared as YYYY-MM strings against `today` (injectable for tests), so no time zone can move
 * a certification across its expiry month.
 */
export function certificationDates(
  issuedOn: string,
  expiresOn: string | null,
  today: string = new Date().toISOString().slice(0, 10),
): { text: string; expired: boolean } {
  const expired = expiresOn !== null && expiresOn.slice(0, 7) < today.slice(0, 7);
  const issued = `Issued ${formatMonth(issuedOn)}`;
  if (!expiresOn) return { text: issued, expired: false };
  return {
    text: `${issued}, ${expired ? 'expired' : 'expires'} ${formatMonth(expiresOn)}`,
    expired,
  };
}
