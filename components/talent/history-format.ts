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
