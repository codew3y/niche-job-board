import Link from 'next/link';

import { ApplyDialog } from './apply-dialog';

/**
 * Everything that can be true when someone lands on a job, and what to show for each.
 *
 * Each branch says what to DO next rather than just what is wrong. "You need a profile" is
 * a dead end; "create one, it takes a few minutes" is a path.
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

const STATUS_COPY: Record<string, string> = {
  applied: 'Applied — waiting on the client.',
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
        <div className="rounded-[--radius] border border-border-base bg-surface-sunken p-4">
          <p className="font-medium">{STATUS_COPY[state.status] ?? state.status}</p>
          <p className="mt-1 text-sm">
            <Link href="/dashboard/talent/applications" className="text-accent hover:underline">
              See all your applications
            </Link>
          </p>
        </div>
      );

    case 'signed-out':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/login?next=${encodeURIComponent(`/jobs/${slug}`)}`}
            className="inline-flex h-11 items-center rounded-[--radius] bg-accent px-5 font-medium text-accent-text transition-colors duration-[--duration-fast] hover:bg-accent-hover"
          >
            Sign in to apply
          </Link>
          {/* ?next preserves where they were, so signing in returns them to this job rather
              than dumping them on a dashboard. */}
          <p className="text-sm text-text-muted">Takes a minute with Google or GitHub.</p>
        </div>
      );

    case 'no-profile':
      return (
        <div className="rounded-[--radius] border border-border-base p-4">
          <p className="font-medium">You need a talent profile to apply</p>
          <p className="mt-1 text-sm text-text-muted text-pretty">
            Clients see the work behind an application, not just the note.
          </p>
          <Link
            href="/onboarding/talent/basics"
            className="mt-3 inline-flex h-10 items-center rounded-[--radius] bg-accent px-4 text-sm font-medium text-accent-text"
          >
            Create one
          </Link>
        </div>
      );

    case 'unpublished':
      return (
        <div className="rounded-[--radius] border border-warning/40 bg-warning/5 p-4">
          <p className="font-medium">Publish your profile first</p>
          <p className="mt-1 text-sm text-text-muted text-pretty">
            Otherwise the client receives your application but cannot see any of your work — which
            is the one thing that would make them say yes.
          </p>
          <Link
            href="/onboarding/talent/review"
            className="mt-3 inline-flex h-10 items-center rounded-[--radius] bg-accent px-4 text-sm font-medium text-accent-text"
          >
            Finish and publish
          </Link>
        </div>
      );

    case 'own-job':
      return (
        <p className="text-sm text-text-muted">
          This is your job.{' '}
          <Link href="/dashboard/client/jobs" className="text-accent hover:underline">
            See applications
          </Link>
        </p>
      );

    case 'is-client':
      return (
        <p className="text-sm text-text-muted text-pretty">
          You&rsquo;re signed in as a client. Add a talent profile from{' '}
          <Link href="/dashboard/settings/roles" className="text-accent hover:underline">
            settings
          </Link>{' '}
          if you want to apply to work too — one account holds both.
        </p>
      );

    case 'closed':
      return (
        <p className="text-sm text-text-muted">This job is no longer accepting applications.</p>
      );
  }
}
