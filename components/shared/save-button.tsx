import { toggleSavedJob, toggleSavedTalent } from '@/lib/actions/saved';

/**
 * Bookmark toggle.
 *
 * `aria-pressed` rather than a label that changes between "Save" and "Unsave": the control
 * is one thing with two states, and a toggle button is how that is expressed to a screen
 * reader. No animation — this is a frequently-used control, where motion reads as lag.
 */
export function SaveButton({
  kind,
  id,
  saved,
  label,
}: {
  kind: 'job' | 'talent';
  id: string;
  saved: boolean;
  label: string;
}) {
  const action = kind === 'job' ? toggleSavedJob : toggleSavedTalent;
  const field = kind === 'job' ? 'jobId' : 'talentId';

  return (
    <form action={action}>
      <input type="hidden" name={field} value={id} />
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 text-sm transition-colors duration-fast
          ${saved ? 'border-accent bg-accent-subtle text-accent' : 'border-border-strong hover:bg-surface-sunken'}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          aria-hidden="true"
          fill={saved ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 2h8a1 1 0 0 1 1 1v11l-5-3-5 3V3a1 1 0 0 1 1-1z" strokeLinejoin="round" />
        </svg>
        {saved ? 'Saved' : 'Save'}
      </button>
    </form>
  );
}
