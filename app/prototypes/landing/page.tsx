import { Picker } from '../picker';
import { EditorialLanding } from './editorial';
import { SignalLanding } from './signal';
import { TerminalLanding } from './terminal';

/** Landing page directions. Keys 1–3 or ←/→ to flip, R to replay the entrance. */
export default async function LandingPrototypes({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const v = parseInt((await searchParams).v ?? '1', 10) - 1;
  return (
    <Picker names={['Terminal', 'Editorial', 'Signal']} initial={Number.isNaN(v) ? 0 : v}>
      {[<TerminalLanding key="t" />, <EditorialLanding key="e" />, <SignalLanding key="s" />]}
    </Picker>
  );
}
