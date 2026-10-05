import { Flag } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ActionForm } from '@/components/ui/action-form';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeading } from '@/components/ui/page-header';
import { SubmitButton } from '@/components/ui/submit-button';
import { requireAdmin } from '@/lib/admin';
import { closeReportedJob, resolveReport, unpublishReportedProfile } from '@/lib/actions/admin';
import { adminReports, type AdminReport } from '@/lib/services/admin-reports';

export const metadata: Metadata = { title: 'Reports', robots: { index: false, follow: false } };

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const KIND: Record<AdminReport['subjectType'], string> = {
  profile: 'Profile',
  job: 'Job',
  message: 'Message',
  conversation: 'Conversation',
};

/**
 * The reports queue, for the people in ADMIN_EMAILS (everyone else gets a 404). Oldest open
 * report first, so nothing waits forever behind newer ones; then the 20 most recently resolved.
 */
export default async function AdminPage() {
  await requireAdmin();
  const { open, resolved } = await adminReports();

  return (
    <div className="max-w-4xl space-y-10">
      <PageHeader
        title="Reports"
        subtitle={`${open.length} open. Oldest first. Nothing here is deleted: closing a job or unpublishing a profile can be undone by its owner.`}
      />

      {open.length === 0 ? (
        <EmptyState icon={Flag} title="No open reports" body="New reports will appear here." />
      ) : (
        <ul className="space-y-4">
          {open.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <section aria-labelledby="resolved-heading">
          <SectionHeading id="resolved-heading" title="Recently resolved" />
          <ul className="space-y-4">
            {resolved.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ReportCard({ report: r }: { report: AdminReport }) {
  const s = r.subject;
  return (
    <li className="rounded-lg border border-border-base bg-surface-raised p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral">{KIND[r.subjectType]}</Badge>
        {r.resolvedAt ? (
          <Badge tone="outline">Resolved {when(r.resolvedAt)}</Badge>
        ) : (
          <Badge tone="warning">Open</Badge>
        )}
        <span className="text-sm text-text-subtle tabular-nums">
          Reported {when(r.createdAt)} by {r.reporter}
        </span>
      </div>

      <p className="mt-3 whitespace-pre-line text-text text-pretty">{r.reason}</p>

      <div className="mt-4 rounded-md bg-surface-sunken p-4 text-sm">
        {s.kind === 'profile' && (
          <p>
            <Link href={`/talent/${s.slug}`} className="prose-link font-semibold">
              {s.headline}
            </Link>{' '}
            <span className="text-text-muted">
              {s.published ? '(published)' : '(not published)'}
            </span>
          </p>
        )}
        {s.kind === 'job' && (
          <p>
            <Link href={`/jobs/${s.slug}`} className="prose-link font-semibold">
              {s.title}
            </Link>{' '}
            <span className="text-text-muted">({s.status})</span>
          </p>
        )}
        {s.kind === 'messages' &&
          (s.lines.length > 0 ? (
            <ol className="space-y-2" aria-label="Latest messages">
              {s.lines.map((m, i) => (
                <li key={i}>
                  <span className="font-semibold capitalize">{m.from}</span>{' '}
                  <span className="text-text-subtle tabular-nums">{when(m.at)}</span>
                  <p className="whitespace-pre-line text-text-muted">{m.body}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-text-muted">No messages found.</p>
          ))}
        {s.kind === 'missing' && (
          <p className="text-text-muted">It no longer exists (deleted since it was reported).</p>
        )}
      </div>

      {!r.resolvedAt && (
        <div className="mt-4 flex flex-wrap gap-2">
          {s.kind === 'job' && s.status === 'open' && (
            <ActionForm action={closeReportedJob} success="Job closed and report resolved">
              <input type="hidden" name="reportId" value={r.id} />
              <input type="hidden" name="jobId" value={r.subjectId} />
              <SubmitButton variant="danger" size="sm" pendingLabel="Closing…">
                Close job and resolve
              </SubmitButton>
            </ActionForm>
          )}
          {s.kind === 'profile' && s.published && (
            <ActionForm
              action={unpublishReportedProfile}
              success="Profile unpublished and report resolved"
            >
              <input type="hidden" name="reportId" value={r.id} />
              <input type="hidden" name="talentId" value={r.subjectId} />
              <SubmitButton variant="danger" size="sm" pendingLabel="Unpublishing…">
                Unpublish profile and resolve
              </SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={resolveReport} success="Report resolved">
            <input type="hidden" name="reportId" value={r.id} />
            <SubmitButton variant="secondary" size="sm" pendingLabel="Resolving…">
              Resolve, no action
            </SubmitButton>
          </ActionForm>
        </div>
      )}
    </li>
  );
}
