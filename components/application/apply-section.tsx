import { CheckCircle2, CircleAlert, Lock } from 'lucide-react';
import Link from 'next/link';

import { buttonStyles } from '@/components/ui/button';
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
 * This is the confirmation after applying, not just a status readout — ApplyDialog cannot show
 * one (see its comment), so the `applied` line reads as a completed action.
 */
const STATUS_COPY: Record<string, string> = {
  applied: 'Application sent — waiting on the client.',
  viewed: 'The client has opened your application.',
  shortlisted: "You've been shortlisted.",
  rejected: 'Not taken forward this time.',
  hired: 'You got it.',
  withdrawn: 'You withdrew this application.',
};

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

    case 'already-applied':
      return (
        <div role="status" className="rounded-lg bg-success-subtle p-4">
          <p className="flex items-start gap-2 font-medium text-success">
            <CheckCircle2 aria-hidden="true" size={18} className="mt-0.5 shrink-0" />
            {STATUS_COPY[state.status] ?? state.status}
          </p>
          <Link
            href="/dashboard/talent/applications"
            className="prose-link mt-2 inline-block text-sm"
          >
            See all your applications
          </Link>
        </div>
      );

    case 'signed-out':
      return (
        <div className="space-y-2.5">
          {/* ?next preserves where they were, so signing in returns them to this job rather than
              dumping them on a dashboard. */}
          <Link
            href={`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`}
            className={buttonStyles({ variant: 'accent', size: 'lg', className: 'w-full' })}
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
            <strong className="block font-medium text-text">
              You need a talent profile to apply
            </strong>
            Clients see the work behind an application, not just the note.
          </p>
          <Link href="/onboarding/talent/basics" className={buttonStyles({ className: 'w-full' })}>
            Create one
          </Link>
        </div>
      );

    case 'unpublished':
      return (
        <div className="space-y-3 rounded-lg bg-warning-subtle p-4">
          <p className="text-sm text-pretty">
            <strong className="flex items-center gap-1.5 font-medium text-warning">
              <CircleAlert aria-hidden="true" size={16} />
              Publish your profile first
            </strong>
            <span className="mt-1 block text-text-muted">
              Otherwise the client receives your application but cannot see any of your work — the
              one thing that would make them say yes.
            </span>
          </p>
          <Link href="/onboarding/talent/review" className={buttonStyles({ size: 'sm' })}>
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
          You&rsquo;re signed in as a client. Add a talent profile from{' '}
          <Link href="/dashboard/settings/roles" className="prose-link font-medium">
            settings
          </Link>{' '}
          if you want to apply to work too — one account holds both.
        </p>
      );

    case 'closed':
      return (
        <p className="flex items-center gap-2 text-sm text-text-muted">
          <Lock aria-hidden="true" size={15} />
          No longer accepting applications.
        </p>
      );
  }
}
