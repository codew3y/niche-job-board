import { Bookmark } from 'lucide-react';

import { toggleSavedJob, toggleSavedTalent } from '@/lib/actions/saved';
import { cn } from '@/lib/ui/cn';

/**
 * Bookmark toggle.
 *
 * `aria-pressed` rather than a label that changes between "Save" and "Unsave": the control is
 * one thing with two states, and a toggle button is how that is expressed to a screen reader.
 * A plain server form, so it works before JavaScript loads. No animation beyond the press: a
 * frequently used control, where motion reads as lag.
 *
 * The saved state is a navy fill plus a filled bookmark plus the word "Saved", so it never
 * relies on colour alone. 40px tall: the minimum tap target on a phone.
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
    // relative + z-raised: the card this sits in may make its title link cover the whole row,
    // and the bookmark must stay above that overlay to remain its own target.
    <form action={action} className="relative z-raised shrink-0">
      <input type="hidden" name={field} value={id} />
      <button
        type="submit"
        aria-pressed={saved}
        aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
        className={cn(
          'pressable inline-flex h-10 items-center gap-1.5 rounded-md border px-3.5 text-sm font-semibold',
          saved
            ? 'border-primary bg-primary text-primary-text hover:bg-primary-hover'
            : 'border-control bg-surface-raised text-text hover:bg-surface-sunken',
        )}
      >
        <Bookmark aria-hidden="true" size={15} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Saved' : 'Save'}
      </button>
    </form>
  );
}
