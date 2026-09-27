import { Picker } from '../picker';
import { EditorialDashboard } from './editorial';
import { SignalDashboard } from './signal';
import { TerminalDashboard } from './terminal';

/** Developer dashboard directions. Keys 1–3 or ←/→ to flip. */
export default async function DashboardPrototypes({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const v = parseInt((await searchParams).v ?? '1', 10) - 1;
  return (
    <Picker names={['Terminal', 'Editorial', 'Signal']} initial={Number.isNaN(v) ? 0 : v}>
      {[<TerminalDashboard key="t" />, <EditorialDashboard key="e" />, <SignalDashboard key="s" />]}
    </Picker>
  );
}
