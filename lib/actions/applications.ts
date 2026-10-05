'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  applicantEmail,
  applicantHeadline,
  applicantUser,
  jobOwnerEmail,
  jobOwnerUser,
} from '../email/recipients';
import { sendEmailInBackground } from '../email/send';
import { EMAILED_STATUSES, newApplicationEmail, statusChangeEmail } from '../email/templates';
import { notify } from '../notifications/notify';
import { applyInput, statusChangeInput } from '../schemas/application';
import { createClient } from '../supabase/server';
import type { ActionResult } from './auth';
import { isRateLimited } from './rate-limit';

/**
 * Applying, withdrawing, and moving an application through its states.
 *
 * The rules that matter here live in three places on purpose:
 *   - one application per talent per job is a UNIQUE constraint, not a check-then-insert.
 *     A check-then-insert races with itself on a double-click
 *   - who may write the row at all is RLS
 *   - which transitions are legal is `allowedStatusTransitions` (lib/schemas/enums.ts),
 *     because RLS cannot express value-level rules
 */

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export async function applyToJob(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = applyInput.safeParse({
    jobId: formData.get('jobId'),
    coverNote: formData.get('coverNote'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the field below.', fields: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('talent_profiles')
    .select('id, is_published')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      message: 'You need a talent profile before applying. It takes a few minutes.',
    };
  }

  /**
   * A published profile is required to apply, and this is a deliberate product decision
   * rather than a technical limit.
   *
   * RLS would permit an unpublished profile to apply. But `talent_profiles` is only readable
   * when published, so the client would receive an application whose profile 404s for them —
   * a name, a cover note, and no way to see any of the evidence this product exists to
   * surface. Refusing here, with a link to the blocker, is better than delivering that.
   */
  if (!profile.is_published) {
    return {
      ok: false,
      message:
        'Publish your profile first — otherwise the client gets your application but cannot see any of your work.',
    };
  }

  const { error } = await supabase.from('applications').insert({
    job_id: parsed.data.jobId,
    talent_id: profile.id,
    cover_note: parsed.data.coverNote,
  });

  if (error) {
    // 23505 = unique violation. The constraint is the guard; this just translates it into
    // something a human can act on.
    if (error.code === '23505') {
      return { ok: false, message: 'You have already applied to this job.' };
    }
    if (isRateLimited(error)) {
      return {
        ok: false,
        message:
          'You have sent several applications in the last minute. Give each one a moment, then try again.',
      };
    }
    // An insert blocked by RLS means the job is not open, since ownership is already proven.
    if (error.code === '42501') {
      return { ok: false, message: 'This job is no longer accepting applications.' };
    }
    return { ok: false, message: 'Could not send your application. Try again.' };
  }

  /**
   * Notify the job owner — AFTER the insert, and never in a way that can undo it.
   *
   * Order matters: the recipient lookup uses the service role, which answers for anyone. Doing
   * it before the RLS-checked insert would mean an address was resolved for a job the caller
   * had not yet proven they could apply to. The insert is the authorization.
   */
  void notifyJobOwner(parsed.data.jobId, profile.id);

  revalidatePath('/dashboard/talent/applications');
  return { ok: true };
}

async function notifyJobOwner(jobId: string, talentProfileId: string): Promise<void> {
  const [owner, headline, ownerUser] = await Promise.all([
    jobOwnerEmail(jobId),
    applicantHeadline(talentProfileId),
    jobOwnerUser(jobId),
  ]);
  // In-app (the bell), independent of email: someone with no deliverable address still sees it.
  if (ownerUser) {
    void notify(
      ownerUser.userId,
      'application_received',
      { jobId, jobTitle: ownerUser.jobTitle, applicantHeadline: headline },
      `application:${jobId}:${talentProfileId}`,
    );
  }
  if (!owner) return;
  sendEmailInBackground(
    newApplicationEmail({
      to: owner.email,
      jobTitle: owner.jobTitle,
      jobId,
      applicantHeadline: headline,
    }),
  );
}

export async function withdrawApplication(formData: FormData): Promise<void> {
  const id = String(formData.get('applicationId') ?? '');
  if (!id) return;

  const supabase = await createClient();
  const { data: application } = await supabase
    .from('applications')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (!application) return;

  // Validated against the transition table: talent may withdraw, but not from a terminal
  // state. Reopening a rejected application by withdrawing it is not a thing.
  const legal = statusChangeInput.safeParse({
    applicationId: id,
    actor: 'talent',
    from: application.status,
    to: 'withdrawn',
  });
  if (!legal.success) return;

  await supabase.from('applications').update({ status: 'withdrawn' }).eq('id', id);
  revalidatePath('/dashboard/talent/applications');
}

/**
 * Client-side status changes: viewed, shortlisted, rejected, hired.
 *
 * The transition table is what stops a client jumping straight from `applied` to `hired`,
 * or reopening something they already rejected. RLS proves they own the job; it cannot
 * express which values are reachable from which.
 */
export async function updateApplicationStatus(formData: FormData): Promise<void> {
  const id = String(formData.get('applicationId') ?? '');
  const to = String(formData.get('status') ?? '');
  if (!id || !to) return;

  const supabase = await createClient();
  const { data: application } = await supabase
    .from('applications')
    .select('status, job_id')
    .eq('id', id)
    .maybeSingle();
  if (!application) return;

  const legal = statusChangeInput.safeParse({
    applicationId: id,
    actor: 'client',
    from: application.status,
    to,
  });
  if (!legal.success) return;

  const { error: updateError } = await supabase
    .from('applications')
    .update({ status: to })
    .eq('id', id);
  /**
   * Only notify if the write actually landed. Sending "you have been shortlisted" for an
   * update RLS refused is worse than sending nothing — it is a promise the database did not
   * make. The previous version ignored the result entirely.
   */
  if (!updateError) void notifyApplicant(id, to);

  // The status timeline is written by the application_events trigger, not here — an audit
  // log the caller writes is not an audit log (migration 0001).
  revalidatePath(`/dashboard/client/jobs/${application.job_id}`);
  revalidatePath('/dashboard/client/jobs');
}

async function notifyApplicant(applicationId: string, status: string): Promise<void> {
  // In-app for the same statuses that are emailed: "viewed" and "withdrawn" are not news.
  if (EMAILED_STATUSES.includes(status)) {
    const user = await applicantUser(applicationId);
    if (user) {
      void notify(
        user.userId,
        'application_status_changed',
        { status, jobTitle: user.jobTitle, company: user.company },
        `status:${applicationId}`,
      );
    }
  }
  const recipient = await applicantEmail(applicationId);
  if (!recipient) return;
  // Returns null for transitions not worth an email — `viewed` most of all. See templates.ts.
  const message = statusChangeEmail({
    to: recipient.email,
    jobTitle: recipient.jobTitle,
    status,
  });
  if (message) sendEmailInBackground(message);
}
