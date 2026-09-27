import { Badge } from '@/components/ui/badge';

const TONE = {
  applied: 'neutral',
  viewed: 'neutral',
  shortlisted: 'accent',
  hired: 'success',
  rejected: 'danger',
  withdrawn: 'outline',
} as const;

const LABELS: Record<string, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  rejected: 'Not taken forward',
  withdrawn: 'Withdrawn',
};

/** An application's status, in words — "Not taken forward", never "rejected". */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONE[status as keyof typeof TONE] ?? 'neutral'}>{LABELS[status] ?? status}</Badge>
  );
}

export { LABELS as STATUS_LABELS };
