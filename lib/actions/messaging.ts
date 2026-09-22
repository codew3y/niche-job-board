'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import {
  blockInput,
  reportInput,
  sendMessageInput,
  startConversationInput,
} from '../schemas/messaging';
import { createClient } from '../supabase/server';
import type { ActionResult } from './auth';

/**
 * Direct messaging — in v1 by owner decision (ADR-007 D1).
 *
 * The defences here are v1 scope, not Phase 5 polish. There is no human review queue behind
 * this feature (docs/constraints.md §6), so block, report and the rate limit ARE the
 * moderation, and they have to work on the day messaging ships.
 *
 * Three rules shape every function below:
 *   1. WHO may write is RLS, never a check in this file. These are convenience paths over the
 *      policies in lib/db/schema/messaging.ts, not the enforcement.
 *   2. A block is SILENT to the blocked sender. Telling someone they have been blocked is what
 *      makes them open a second account (docs/flows/README.md §10).
 *   3. "Silent" means silent about the reason, not silent about everything — a real failure
 *      must still surface. Hence the 42501 check rather than a blanket catch.
 */

/** Postgres insufficient_privilege — what an RLS WITH CHECK violation raises. */
const RLS_DENIED = '42501';
const UNIQUE_VIOLATION = '23505';

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_');
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/**
 * The one message shown for every reason a send can be refused: profile unpublished, messages
 * turned off, or sender blocked. They MUST read identically — three distinguishable errors are
 * an oracle that tells a blocked sender which one they hit.
 */
const REFUSED = 'This developer is not accepting messages right now.';

/**
 * Conversation creation is the rate-limited action, not message sending.
 *
 * One message to a thousand people is the abuse pattern on an open marketplace; a thousand
 * messages to one person is a different and much rarer problem, and the recipient can end it
 * themselves with a block. docs/api.md caps new conversations at 5/min.
 *
 * Counted in the application layer because Upstash is not wired until the Phase 4 rate-limit
 * work. The database still decides WHO may create the row; this only decides how often.
 */
const RATE_WINDOW_MS = 60_000;
const MAX_NEW_CONVERSATIONS = 5;

export async function startConversation(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const rawJobId = formData.get('jobId');
  const parsed = startConversationInput.safeParse({
    talentId: formData.get('talentId'),
    jobId: rawJobId ? String(rawJobId) : undefined,
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the message below.', fields: fieldErrors(parsed.error) };
  }
  const { talentId, body } = parsed.data;
  const jobId = parsed.data.jobId ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent('/talent')}`);

  const { data: client } = await supabase
    .from('client_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!client) {
    return {
      ok: false,
      message: 'Only clients can start a conversation. Add a client profile in settings first.',
    };
  }

  /**
   * Reuse before insert. Two threads about the same job between the same two people is not a
   * thing the product has a way to show, and the unique constraints would refuse it anyway —
   * finding the existing row is a better answer than reporting a conflict to someone who was
   * just trying to send a message.
   */
  const existingQuery = supabase
    .from('conversations')
    .select('id')
    .eq('client_id', client.id)
    .eq('talent_id', talentId);
  const { data: existing } = await (
    jobId ? existingQuery.eq('job_id', jobId) : existingQuery.is('job_id', null)
  ).maybeSingle();

  if (existing) {
    const sent = await postMessage(supabase, existing.id, user.id, body);
    if (!sent.ok) return sent;
    revalidatePath('/dashboard/messages');
    redirect(`/dashboard/messages/${existing.id}`);
  }

  const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
  const { count } = await supabase
    .from('conversations')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', client.id)
    .gte('created_at', since);
  if ((count ?? 0) >= MAX_NEW_CONVERSATIONS) {
    return {
      ok: false,
      message: 'You have started several conversations in the last minute. Try again shortly.',
    };
  }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ client_id: client.id, talent_id: talentId, job_id: jobId })
    .select('id')
    .single();

  if (error || !created) {
    // Lost a race with a concurrent first message — the thread exists now, so use it.
    if (error?.code === UNIQUE_VIOLATION) {
      const retry = supabase
        .from('conversations')
        .select('id')
        .eq('client_id', client.id)
        .eq('talent_id', talentId);
      const { data: row } = await (
        jobId ? retry.eq('job_id', jobId) : retry.is('job_id', null)
      ).maybeSingle();
      if (row) {
        const sent = await postMessage(supabase, row.id, user.id, body);
        if (!sent.ok) return sent;
        revalidatePath('/dashboard/messages');
        redirect(`/dashboard/messages/${row.id}`);
      }
    }
    if (error?.code === RLS_DENIED) return { ok: false, message: REFUSED };
    return { ok: false, message: 'Could not start that conversation. Try again.' };
  }

  const sent = await postMessage(supabase, created.id, user.id, body);
  if (!sent.ok) {
    /**
     * The thread exists but carries no message. Remove it rather than leaving an empty row in
     * both inboxes — and so a later retry is not refused by the unique constraint on a thread
     * that never said anything.
     */
    await supabase.from('conversations').delete().eq('id', created.id);
    return sent;
  }

  revalidatePath('/dashboard/messages');
  redirect(`/dashboard/messages/${created.id}`);
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

/**
 * The single insert path for a message, shared by both entry points so the block behaviour
 * cannot drift between "first message" and "reply".
 *
 * Returns ok for a blocked send. That is the silent no-op: the sender sees their message
 * posted, and nothing is written.
 */
async function postMessage(
  supabase: SupabaseClient,
  conversationId: string,
  senderId: string,
  body: string,
): Promise<ActionResult> {
  const { error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (!error) return { ok: true };
  if (error.code === RLS_DENIED) return { ok: true };
  return { ok: false, message: 'Could not send that message. Try again.' };
}

export async function sendMessage(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = sendMessageInput.safeParse({
    conversationId: formData.get('conversationId'),
    body: formData.get('body'),
  });
  if (!parsed.success) {
    return { ok: false, message: 'Check the message below.', fields: fieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  /**
   * The block check runs per message, not only at thread creation, so a block applied
   * mid-conversation takes effect on the very next send.
   */
  const result = await postMessage(supabase, parsed.data.conversationId, user.id, parsed.data.body);
  revalidatePath(`/dashboard/messages/${parsed.data.conversationId}`);
  revalidatePath('/dashboard/messages');
  return result;
}

export async function markRead(formData: FormData): Promise<void> {
  const conversationId = String(formData.get('conversationId') ?? '');
  if (!conversationId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  revalidatePath('/dashboard/messages');
}

export async function blockUser(formData: FormData): Promise<void> {
  const parsed = blockInput.safeParse({ userId: formData.get('userId') });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Blocking twice is not an error; the primary key makes the second one a no-op.
  await supabase
    .from('blocks')
    .upsert(
      { blocker_id: user.id, blocked_id: parsed.data.userId },
      { onConflict: 'blocker_id,blocked_id', ignoreDuplicates: true },
    );
  revalidatePath('/dashboard/messages');
}

export async function unblockUser(formData: FormData): Promise<void> {
  const parsed = blockInput.safeParse({ userId: formData.get('userId') });
  if (!parsed.success) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', parsed.data.userId);
  revalidatePath('/dashboard/messages');
}

export async function reportContent(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = reportInput.safeParse({
    subjectType: formData.get('subjectType'),
    subjectId: formData.get('subjectId'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Tell us briefly what is wrong.',
      fields: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    subject_type: parsed.data.subjectType,
    subject_id: parsed.data.subjectId,
    reason: parsed.data.reason,
  });
  if (error) return { ok: false, message: 'Could not send that report. Try again.' };

  /**
   * There is no queue, no triage and no auto-action behind this (docs/constraints.md §6). The
   * confirmation the dialog renders says so, rather than implying a process that does not
   * exist — and points at block, which is the control the reporter actually holds.
   */
  return { ok: true };
}
