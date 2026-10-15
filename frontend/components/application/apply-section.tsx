import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import {
  ArrowRight,
  CheckCircle as CheckCircle2,
  WarningCircle as CircleAlert,
  Clock,
  Lock,
} from '@phosphor-icons/react/ssr';
import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
import { cn } from '@/lib/ui/cn';
import { ApplyDialog } from './apply-dialog';

/**
 * Everything that can be true when someone lands on a job, and what to show for each.
 *
 * Each branch says what to DO next rather than just what is wrong. "You need a profile" is a
 * dead end; "create one, it takes a few minutes" is a path.
 */
export type ApplyState =
  | { kind: 'can-apply' }
  | { kind: 'already-applied'; status: string }
  | { kind: 'signed-out' }
  | { kind: 'no-profile' }
  | { kind: 'unpublished' }
  | { kind: 'is-client' }
  | { kind: 'own-job' }
  | { kind: 'closed' };

/**
 * This is the confirmation after applying, not just a status readout. ApplyDialog cannot show
 * one (see its comment), so the `applied` line reads as a completed action.
 *
 * The tone follows the status map in frontend/components/job/job-status-badge.tsx: success for sent and
 * hired, info for moving forward, a quiet neutral for everything else. "Not taken forward" is
 * never shown in an alarm colour.
 */
const STATUS: Record<
  string,
  { copy: string; tone: 'success' | 'info' | 'neutral'; icon: PhosphorIcon }
> = {
  applied: {
    copy: 'Application sent. Waiting on the client.',
    tone: 'success',
    icon: CheckCircle2,
  },
  viewed: { copy: 'The client has opened your application.', tone: 'neutral', icon: Clock },
  shortlisted: { copy: "You've been shortlisted.", tone: 'info', icon: CheckCircle2 },
  rejected: { copy: 'Not taken forward this time.', tone: 'neutral', icon: CircleAlert },
  hired: { copy: 'You got it.', tone: 'success', icon: CheckCircle2 },
  withdrawn: { copy: 'You withdrew this application.', tone: 'neutral', icon: CircleAlert },
};

const TONE_BOX = {
  success: 'bg-success-subtle text-success',
  info: 'bg-info-subtle text-info',
  neutral: 'bg-surface-sunken text-text',
} as const;

export function ApplySection({
  state,
  jobId,
  jobTitle,
  slug,
}: {
  state: ApplyState;
  jobId: string;
  jobTitle: string;
  slug: string;
}) {
  switch (state.kind) {
    case 'can-apply':
      return <ApplyDialog jobId={jobId} jobTitle={jobTitle} />;

    case 'already-applied': {
      const s = STATUS[state.status] ?? {
        copy: state.status,
        tone: 'neutral' as const,
        icon: Clock,
      };
      const Icon = s.icon;
      return (
        <div role="status" className={cn('rounded-md p-4', TONE_BOX[s.tone])}>
          <p className="flex items-start gap-2 font-semibold">
            <Icon aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            {s.copy}
          </p>
          <Link
            href="/dashboard/talent/applications"
            className="prose-link mt-1 inline-flex min-h-10 items-center gap-1 text-sm font-semibold"
          >
            See all your applications
            <ArrowRight aria-hidden="true" size={14} />
          </Link>
        </div>
      );
    }

    case 'signed-out':
      return (
        <div className="space-y-2.5">
          {/* ?next preserves where they were, so signing in returns them to this job rather than
              dumping them on a dashboard. */}
          <Link
            href={`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`}
            className={buttonStyles({ size: 'lg', className: 'w-full' })}
          >
            Sign in to apply
          </Link>
          <p className="text-center text-sm text-text-subtle">
            Takes a minute with Google or GitHub.
          </p>
        </div>
      );

    case 'no-profile':
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-muted text-pretty">
            <strong className="block font-semibold text-text">
              You need a talent profile to apply
            </strong>
            Clients see the work behind an application, not just the note.
          </p>
          <Link
            href="/onboarding/talent/basics"
            className={buttonStyles({ size: 'lg', className: 'w-full' })}
          >
            Create a profile
          </Link>
        </div>
      );

    case 'unpublished':
      return (
        <div className="space-y-3 rounded-md bg-warning-subtle p-4">
          <p className="text-sm text-pretty">
            <strong className="flex items-center gap-1.5 font-semibold text-warning">
              <CircleAlert aria-hidden="true" size={16} className="shrink-0" />
              Publish your profile first
            </strong>
            <span className="mt-1 block text-text">
              Otherwise the client gets your application but cannot see your work, which is what
              they decide on.
            </span>
          </p>
          <Link href="/onboarding/talent/review" className={buttonStyles({ className: 'w-full' })}>
            Finish and publish
          </Link>
        </div>
      );

    case 'own-job':
      return (
        <div className="space-y-3">
          <p className="text-sm text-text-muted">This is your job.</p>
          <Link
            href="/dashboard/client/jobs"
            className={buttonStyles({ variant: 'secondary', className: 'w-full' })}
          >
            See applications
          </Link>
        </div>
      );

    case 'is-client':
      return (
        <p className="text-sm text-text-muted text-pretty">
          You&rsquo;re viewing as a client. To apply, switch to your developer profile from the
          profile menu, or add one in{' '}
          <Link href="/dashboard/settings/roles" className="prose-link font-semibold">
            settings
          </Link>
          . One account holds both.
        </p>
      );

    case 'closed':
      return (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Lock aria-hidden="true" size={15} className="shrink-0" />
          No longer accepting applications.
        </p>
      );
  }
}
