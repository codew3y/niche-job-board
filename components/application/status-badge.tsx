import { Badge } from '@/components/ui/badge';

/**
 * Tones follow the one-meaning-per-colour map in components/job/job-status-badge.tsx.
 * "Not taken forward" is deliberately NOT red: it is an outcome, not an error, and a developer
 * reading their own applications should not see it styled as a failure.
 */
const TONE = {
  applied: 'neutral',
  viewed: 'neutral',
  shortlisted: 'info',
  hired: 'success',
  rejected: 'outline',
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

/** An application's status, in words: "Not taken forward", never "rejected". */
export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={TONE[status as keyof typeof TONE] ?? 'neutral'}>{LABELS[status] ?? status}</Badge>
  );
}

export { LABELS as STATUS_LABELS };
