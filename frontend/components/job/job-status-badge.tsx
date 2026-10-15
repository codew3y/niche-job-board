import { Badge } from '@/components/ui/badge';

/**
 * A job's lifecycle state. The raw enum used to render as-is ("open", "draft"): a database
 * value is not a label.
 *
 * STATUS TONES, one meaning per colour, shared with the application StatusBadge:
 *   success  live, or a good outcome        Open, Filled, Hired
 *   info     moving forward                 Shortlisted
 *   neutral  waiting on someone             Applied, Viewed
 *   outline  not live, or finished          Draft, Closed, Withdrawn, Not taken forward
 * Danger is never a status: it is reserved for errors and destructive actions.
 */
const JOB_STATUS = {
  open: { label: 'Open', tone: 'success' },
  filled: { label: 'Filled', tone: 'success' },
  draft: { label: 'Draft', tone: 'outline' },
  closed: { label: 'Closed', tone: 'outline' },
} as const;

export function JobStatusBadge({ status }: { status: string }) {
  const s = JOB_STATUS[status as keyof typeof JOB_STATUS] ?? {
    label: status,
    tone: 'neutral' as const,
  };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
