import 'server-only';

import { requireAdmin } from '../admin';
import { createServiceClient } from '../supabase/server';

export type AdminReport = {
  id: string;
  subjectType: 'profile' | 'job' | 'message' | 'conversation';
  subjectId: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  reporter: string | null;
  subject:
    | { kind: 'profile'; headline: string; slug: string; published: boolean }
    | { kind: 'job'; title: string; slug: string; status: string }
    | {
        kind: 'messages';
        lines: { from: 'client' | 'developer' | 'removed'; body: string; at: string }[];
      }
    | { kind: 'missing' };
};

/**
 * Reports for the admin queue, open first then the 20 most recently resolved, each with what it
 * points at. Service role (reports are only readable by their reporter through the API), behind
 * requireAdmin(). A reported conversation shows its 10 latest messages: the admin cannot act on a
 * report they cannot read, and the privacy policy says reported content is read.
 */
export async function adminReports(): Promise<{ open: AdminReport[]; resolved: AdminReport[] }> {
  await requireAdmin();
  const db = createServiceClient();

  const [{ data: open }, { data: resolved }] = await Promise.all([
    db
      .from('reports')
      .select('id, reporter_id, subject_type, subject_id, reason, created_at, resolved_at')
      .is('resolved_at', null)
      .order('created_at', { ascending: true }),
    db
      .from('reports')
      .select('id, reporter_id, subject_type, subject_id, reason, created_at, resolved_at')
      .not('resolved_at', 'is', null)
      .order('resolved_at', { ascending: false })
      .limit(20),
  ]);

  const rows = [...(open ?? []), ...(resolved ?? [])];
  const ids = (type: string) =>
    rows.filter((r) => r.subject_type === type).map((r) => r.subject_id);
  const reporterIds = [...new Set(rows.map((r) => r.reporter_id).filter(Boolean))] as string[];

  const [profiles, jobs, messages, convoMessages, reporters] = await Promise.all([
    db.from('talent_profiles').select('id, headline, slug, is_published').in('id', ids('profile')),
    db.from('jobs').select('id, title, slug, status').in('id', ids('job')),
    db.from('messages').select('id, conversation_id').in('id', ids('message')),
    db
      .from('messages')
      .select('conversation_id, sender_id, body, created_at')
      .in('conversation_id', ids('conversation'))
      .order('created_at', { ascending: false }),
    db.from('user_profiles').select('user_id, display_name').in('user_id', reporterIds),
  ]);

  // A reported message is shown in its conversation.
  const messageConvo = new Map((messages.data ?? []).map((m) => [m.id, m.conversation_id]));
  const extraConvos = [...new Set(messageConvo.values())];
  const { data: extra } = extraConvos.length
    ? await db
        .from('messages')
        .select('conversation_id, sender_id, body, created_at')
        .in('conversation_id', extraConvos)
        .order('created_at', { ascending: false })
    : { data: [] };
  const allMessages = [...(convoMessages.data ?? []), ...(extra ?? [])];

  const convoIds = [...new Set([...ids('conversation'), ...extraConvos])];
  const { data: convos } = convoIds.length
    ? await db
        .from('conversations')
        .select('id, client_profiles ( user_id ), talent_profiles ( user_id )')
        .in('id', convoIds)
        .overrideTypes<
          {
            id: string;
            client_profiles: { user_id: string } | null;
            talent_profiles: { user_id: string } | null;
          }[]
        >()
    : { data: [] };
  const clientOf = new Map((convos ?? []).map((c) => [c.id, c.client_profiles?.user_id]));

  const linesFor = (conversationId: string) =>
    allMessages
      .filter((m) => m.conversation_id === conversationId)
      .slice(0, 10)
      .reverse()
      .map((m) => ({
        from: (!m.sender_id
          ? 'removed'
          : m.sender_id === clientOf.get(conversationId)
            ? 'client'
            : 'developer') as 'client' | 'developer' | 'removed',
        body: m.body,
        at: m.created_at,
      }));

  const profileBy = new Map((profiles.data ?? []).map((p) => [p.id, p]));
  const jobBy = new Map((jobs.data ?? []).map((j) => [j.id, j]));
  const nameBy = new Map((reporters.data ?? []).map((u) => [u.user_id, u.display_name]));

  const shape = (r: (typeof rows)[number]): AdminReport => {
    let subject: AdminReport['subject'] = { kind: 'missing' };
    if (r.subject_type === 'profile' && profileBy.has(r.subject_id)) {
      const p = profileBy.get(r.subject_id)!;
      subject = { kind: 'profile', headline: p.headline, slug: p.slug, published: p.is_published };
    } else if (r.subject_type === 'job' && jobBy.has(r.subject_id)) {
      const j = jobBy.get(r.subject_id)!;
      subject = { kind: 'job', title: j.title, slug: j.slug, status: j.status };
    } else if (r.subject_type === 'conversation') {
      subject = { kind: 'messages', lines: linesFor(r.subject_id) };
    } else if (r.subject_type === 'message' && messageConvo.has(r.subject_id)) {
      subject = { kind: 'messages', lines: linesFor(messageConvo.get(r.subject_id)!) };
    }
    return {
      id: r.id,
      subjectType: r.subject_type as AdminReport['subjectType'],
      subjectId: r.subject_id,
      reason: r.reason,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      reporter: r.reporter_id ? (nameBy.get(r.reporter_id) ?? 'A user') : 'A deleted account',
      subject,
    };
  };

  return { open: (open ?? []).map(shape), resolved: (resolved ?? []).map(shape) };
}
