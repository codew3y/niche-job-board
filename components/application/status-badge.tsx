const STYLES: Record<string, string> = {
  applied: 'bg-surface-sunken text-text-muted',
  viewed: 'bg-surface-sunken text-text-muted',
  shortlisted: 'bg-accent-subtle text-accent',
  hired: 'bg-success/15 text-success',
  rejected: 'bg-danger-subtle text-danger',
  withdrawn: 'bg-surface-sunken text-text-subtle',
};

const LABELS: Record<string, string> = {
  applied: 'Applied',
  viewed: 'Viewed',
  shortlisted: 'Shortlisted',
  hired: 'Hired',
  rejected: 'Not taken forward',
  withdrawn: 'Withdrawn',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status] ?? STYLES.applied}`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}

export { LABELS as STATUS_LABELS };
