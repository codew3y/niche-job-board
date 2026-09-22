import 'server-only';

import { createServiceClient } from '../supabase/server';

/**
 * Looking up the email address of someone who is not the current user.
 *
 * This needs the SERVICE-ROLE client, and that deserves a sentence rather than a shrug.
 * Addresses live in `auth.users`, which no RLS policy exposes — deliberately, because an
 * address is the one piece of personal data this product holds that is not on a profile.
 * Notifying a job owner about an application therefore cannot be done as the applicant.
 *
 * The narrowness is the safeguard:
 *   - these functions return ONLY an email address, never a row
 *   - they take an id the caller has already proven they may act on, through the RLS-checked
 *     write that happened first. Calling these before that write would be an authorization
 *     hole with no policy behind it
 *   - an address is never returned to the browser. It goes into `to:` and nowhere else
 *
 * Every function returns null rather than throwing. A missing address means no notification,
 * which is the same outcome as a missing API key and is never a reason to fail the action.
 */

async function emailForUser(userId: string): Promise<string | null> {
  try {
    const { data, error } = await createServiceClient().auth.admin.getUserById(userId);
    if (error || !data.user?.email) return null;
    return data.user.email;
  } catch {
    // Includes the case where SUPABASE_SERVICE_ROLE_KEY is absent, which createServiceClient
    // throws for. Local development without it should not break applying to a job.
    return null;
  }
}

/** The client who owns a job, for "you have a new application". */
export async function jobOwnerEmail(
  jobId: string,
): Promise<{ email: string; jobTitle: string } | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('jobs')
      .select('title, client_profiles ( user_id )')
      .eq('id', jobId)
      .maybeSingle()
      .overrideTypes<{ title: string; client_profiles: { user_id: string } | null }>();

    if (!data?.client_profiles?.user_id) return null;
    const email = await emailForUser(data.client_profiles.user_id);
    return email ? { email, jobTitle: data.title } : null;
  } catch {
    return null;
  }
}

/** The developer who applied, for a status change on their application. */
export async function applicantEmail(
  applicationId: string,
): Promise<{ email: string; jobTitle: string } | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from('applications')
      .select('talent_profiles ( user_id ), jobs ( title )')
      .eq('id', applicationId)
      .maybeSingle()
      .overrideTypes<{
        talent_profiles: { user_id: string } | null;
        jobs: { title: string } | null;
      }>();

    if (!data?.talent_profiles?.user_id || !data.jobs?.title) return null;
    const email = await emailForUser(data.talent_profiles.user_id);
    return email ? { email, jobTitle: data.jobs.title } : null;
  } catch {
    return null;
  }
}

/** The applicant's headline, which is how this product identifies a developer. */
export async function applicantHeadline(talentProfileId: string): Promise<string> {
  try {
    const { data } = await createServiceClient()
      .from('talent_profiles')
      .select('headline')
      .eq('id', talentProfileId)
      .maybeSingle();
    return data?.headline ?? 'A developer';
  } catch {
    return 'A developer';
  }
}
