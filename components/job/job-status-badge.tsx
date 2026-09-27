import { Badge } from '@/components/ui/badge';

/**
 * A job's lifecycle state. The raw enum used to render as-is ("open", "draft") — a database
 * value is not a label.
 */
const JOB_STATUS = {
  open: { label: 'Open', tone: 'success' },
  draft: { label: 'Draft', tone: 'outline' },
  closed: { label: 'Closed', tone: 'neutral' },
  filled: { label: 'Filled', tone: 'accent' },
} as const;

export function JobStatusBadge({ status }: { status: string }) {
  const s = JOB_STATUS[status as keyof typeof JOB_STATUS] ?? {
    label: status,
    tone: 'neutral' as const,
  };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
