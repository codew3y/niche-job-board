import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * "Download your data": everything that is yours, as one JSON document.
 *
 * Built with the caller's own session client, so every query is filtered by the same RLS
 * policies as the app itself: the export cannot contain anything the person could not already
 * see on screen. What is in it:
 *   - account: email, sign-in methods, created date; your display name and role
 *   - developer profile: details, skills, projects (with photo links), experience, education,
 *     certifications, connected accounts
 *   - client profile: company details, jobs you posted (with their skills), and for each job the
 *     applications you received as status and dates only: an applicant's cover note is theirs
 *   - applications you made, with each status change
 *   - conversations you are part of, with every message in them (yours marked as yours)
 *   - saved jobs and developers, people you blocked, reports you filed
 * What is deliberately left out: embeddings and search vectors (derived numbers, not your data),
 * match scores (internal ranking), and anything about other people beyond what a conversation
 * already shows you.
 */

/** Columns that are derived machinery, not anyone's data. */
const DERIVED = ['embedding', 'search_vector'] as const;
const clean = <T extends Record<string, unknown>>(row: T) => {
  const out: Record<string, unknown> = { ...row };
  for (const key of DERIVED) delete out[key];
  return out;
};
const cleanAll = (rows: Record<string, unknown>[] | null) => (rows ?? []).map(clean);

/**
 * Every query must succeed. A failed one would otherwise leave a section quietly empty, and an
 * export that silently omits someone's data is worse than one that says it failed.
 */
function must<T>(res: { data: T; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`data export: ${what}: ${res.error.message}`);
  return res.data;
}

export async function buildDataExport(
  supabase: SupabaseClient,
  user: {
    id: string;
    email?: string;
    created_at: string;
    identities?: { provider: string }[] | null;
  },
) {
  const account = must(
    await supabase
      .from('user_profiles')
      .select('display_name, location, active_role, has_talent, has_client, created_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    'account',
  );

  // ── developer side
  const talent = must(
    await supabase.from('talent_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    'developer profile',
  );

  let developer: Record<string, unknown> | null = null;
  if (talent) {
    const [skills, projects, experience, education, certifications, applications, savedJobs] =
      await Promise.all([
        supabase
          .from('talent_skills')
          .select('proficiency, years, skills ( name )')
          .eq('talent_id', talent.id),
        supabase
          .from('portfolio_items')
          .select('*, item_media ( url, alt_text, sort_order )')
          .eq('talent_id', talent.id)
          .order('sort_order'),
        supabase.from('talent_experience').select('*').eq('talent_id', talent.id),
        supabase.from('talent_education').select('*').eq('talent_id', talent.id),
        supabase.from('talent_certifications').select('*').eq('talent_id', talent.id),
        supabase
          .from('applications')
          .select(
            'id, status, cover_note, created_at, updated_at, jobs ( title, slug ), application_events ( from_status, to_status, at )',
          )
          .eq('talent_id', talent.id)
          .order('created_at'),
        supabase
          .from('saved_jobs')
          .select('created_at, jobs ( title, slug )')
          .eq('talent_id', talent.id),
      ]);
    developer = {
      profile: clean(talent),
      skills: must(skills, 'skills'),
      projects: cleanAll(must(projects, 'projects')),
      experience: must(experience, 'experience'),
      education: must(education, 'education'),
      certifications: must(certifications, 'certifications'),
      applications_made: must(applications, 'applications'),
      saved_jobs: must(savedJobs, 'saved jobs'),
    };
  }

  // ── client side
  const company = must(
    await supabase.from('client_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    'company',
  );

  let client: Record<string, unknown> | null = null;
  if (company) {
    const [jobs, savedTalent] = await Promise.all([
      supabase
        .from('jobs')
        .select(
          '*, job_skills ( is_required, skills ( name ) ), applications ( status, created_at, updated_at )',
        )
        .eq('client_id', company.id)
        .order('created_at'),
      supabase
        .from('saved_talent')
        .select('created_at, talent_profiles ( headline, slug )')
        .eq('client_id', company.id),
    ]);
    client = {
      company: clean(company),
      // Applications received: status and dates only. The cover note belongs to the applicant.
      jobs_posted: cleanAll(must(jobs, 'jobs')),
      saved_developers: must(savedTalent, 'saved developers'),
    };
  }

  // ── both sides
  const [conversations, blocks, reports] = await Promise.all([
    supabase
      .from('conversations')
      .select(
        'id, created_at, last_message_at, jobs ( title ), client_profiles ( company_name ), talent_profiles ( headline ), messages ( sender_id, body, created_at, read_at )',
      )
      .order('created_at'),
    supabase.from('blocks').select('blocked_id, created_at').eq('blocker_id', user.id),
    supabase
      .from('reports')
      .select('subject_type, subject_id, reason, created_at, resolved_at')
      .eq('reporter_id', user.id),
  ]);

  type Thread = {
    id: string;
    created_at: string;
    last_message_at: string | null;
    jobs: { title: string } | null;
    client_profiles: { company_name: string } | null;
    talent_profiles: { headline: string } | null;
    messages: {
      sender_id: string | null;
      body: string;
      created_at: string;
      read_at: string | null;
    }[];
  };
  const threads = ((must(conversations, 'conversations') ?? []) as unknown as Thread[]).map(
    (t) => ({
      id: t.id,
      started: t.created_at,
      about_job: t.jobs?.title ?? null,
      company: t.client_profiles?.company_name ?? null,
      developer: t.talent_profiles?.headline ?? null,
      messages: [...(t.messages ?? [])]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((m) => ({
          from: m.sender_id === user.id ? 'you' : 'them',
          body: m.body,
          sent_at: m.created_at,
          read_at: m.read_at,
        })),
    }),
  );

  return {
    exported_at: new Date().toISOString(),
    about:
      'Everything TechSelect holds that is yours, as of exported_at. Derived data (search and matching vectors, match scores) is not included. See https://techselect.vercel.app/privacy.',
    account: {
      email: user.email ?? null,
      created_at: user.created_at,
      sign_in_methods: (user.identities ?? []).map((i) => i.provider),
      ...(account ?? {}),
    },
    developer,
    client,
    conversations: threads,
    people_you_blocked: must(blocks, 'blocks'),
    reports_you_filed: must(reports, 'reports'),
  };
}
