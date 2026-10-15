import { createClient } from '../supabase/server';

/**
 * Read paths for messaging.
 *
 * Nothing here filters by participant. That is deliberate and it is the whole point: the
 * `conversations_select_participants` and `messages_select_participants` policies decide what
 * these queries can see, so a missing `.eq('client_id', me)` here cannot leak a thread. If it
 * could, the policy would be wrong, and that is what backend/src/db/rls.test.ts exists to catch.
 *
 * Adding a redundant participant filter in this file would be worse than useless — it would
 * make the query look safe on its own and hide a policy regression from every test.
 */

export type ConversationSummary = {
  id: string;
  lastMessageAt: string;
  /** The other party, as this viewer sees them. Null once that side deletes their account. */
  counterparty: { name: string; href: string | null } | null;
  jobTitle: string | null;
  jobSlug: string | null;
  preview: string;
  unread: number;
};

type ConversationRow = {
  id: string;
  last_message_at: string;
  job_id: string | null;
  client_profiles: { id: string; company_name: string; user_id: string } | null;
  talent_profiles: {
    id: string;
    headline: string;
    slug: string;
    is_published: boolean;
    user_id: string;
  } | null;
  jobs: { title: string; slug: string } | null;
};

const CONVERSATION_SELECT = `
  id, last_message_at, job_id,
  client_profiles ( id, company_name, user_id ),
  talent_profiles ( id, headline, slug, is_published, user_id ),
  jobs ( title, slug )
`;

/**
 * The inbox, newest activity first.
 *
 * `viewerRole` only decides which side to SHOW as the counterparty — it is presentation, not
 * authorisation. Someone with both roles sees each thread from the side they are actually on,
 * because the opposite side's join simply is not them.
 */
export async function listConversations(viewerUserId: string, limit = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false })
    .limit(limit)
    .overrideTypes<ConversationRow[]>();

  if (error || !data) return [] as ConversationSummary[];

  const ids = data.map((c) => c.id);
  if (ids.length === 0) return [] as ConversationSummary[];

  /**
   * Previews and unread counts in two queries for the whole page rather than two per thread.
   * At 50 threads the per-row version is 100 round trips to render one screen.
   */
  const { data: recent } = await supabase
    .from('messages')
    .select('conversation_id, body, redacted_reason, created_at, sender_id, read_at')
    .in('conversation_id', ids)
    .order('created_at', { ascending: false });

  const latest = new Map<string, { body: string; redacted: boolean }>();
  const unread = new Map<string, number>();
  for (const m of recent ?? []) {
    if (!latest.has(m.conversation_id)) {
      latest.set(m.conversation_id, {
        body: m.body,
        redacted: Boolean(m.redacted_reason),
      });
    }
    if (m.sender_id !== viewerUserId && m.read_at === null) {
      unread.set(m.conversation_id, (unread.get(m.conversation_id) ?? 0) + 1);
    }
  }

  return data.map<ConversationSummary>((c) => {
    const viewerIsTalent = c.talent_profiles?.user_id === viewerUserId;
    const other = viewerIsTalent ? c.client_profiles : c.talent_profiles;
    const last = latest.get(c.id);

    return {
      id: c.id,
      lastMessageAt: c.last_message_at,
      counterparty: other
        ? {
            name: counterpartyName(other),
            // A client has no public page; only a published talent profile is linkable.
            href:
              !viewerIsTalent && c.talent_profiles?.is_published
                ? `/talent/${c.talent_profiles.slug}`
                : null,
          }
        : null,
      jobTitle: c.jobs?.title ?? null,
      jobSlug: c.jobs?.slug ?? null,
      preview: last ? (last.redacted ? 'Message removed' : truncate(last.body, 120)) : '',
      unread: unread.get(c.id) ?? 0,
    };
  });
}

/**
 * What to call the other party.
 *
 * A talent is labelled by HEADLINE, not by name. `talent_profiles` has no name column at all —
 * the person's real name lives on `user_profiles`, and the whole product deliberately presents
 * developers by what they do rather than who they are (the public profile's <h1> is the
 * headline too). Labelling them differently here would make the inbox read as a different
 * person from the profile the client just clicked "Message" on.
 *
 * A client is labelled by company name, which is the only identity a client has.
 */
function counterpartyName(other: { company_name?: string; headline?: string }): string {
  return other.company_name ?? other.headline ?? 'Unknown';
}

function truncate(s: string, max: number) {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1)}…`;
}

export type ThreadMessage = {
  id: string;
  body: string;
  redacted: boolean;
  mine: boolean;
  createdAt: string;
  readAt: string | null;
};

export type Thread = {
  id: string;
  counterparty: { name: string; href: string | null; userId: string | null } | null;
  job: { title: string; slug: string } | null;
  messages: ThreadMessage[];
  /** Whether THIS viewer has blocked the other party. Never the reverse — see below. */
  blocked: boolean;
};

/**
 * One thread. Returns null when the viewer is not a participant, because RLS returns no row —
 * the caller renders a 404 for that, which is the same thing a non-existent id produces.
 */
export async function getThread(id: string, viewerUserId: string): Promise<Thread | null> {
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<ConversationRow>();

  if (!conversation) return null;

  const viewerIsTalent = conversation.talent_profiles?.user_id === viewerUserId;
  const other = viewerIsTalent ? conversation.client_profiles : conversation.talent_profiles;

  const { data: messages } = await supabase
    .from('messages')
    .select('id, body, redacted_reason, sender_id, created_at, read_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true });

  /**
   * Only ever "have I blocked them". `blocks` is readable exclusively by the blocker
   * (`blocks_manage_own`), so the reverse query returns nothing whether or not the other party
   * blocked this viewer — which is exactly the property that keeps a block undiscoverable.
   */
  let blocked = false;
  if (other?.user_id) {
    const { count } = await supabase
      .from('blocks')
      .select('blocker_id', { count: 'exact', head: true })
      .eq('blocker_id', viewerUserId)
      .eq('blocked_id', other.user_id);
    blocked = (count ?? 0) > 0;
  }

  return {
    id: conversation.id,
    counterparty: other
      ? {
          name: counterpartyName(other),
          href:
            !viewerIsTalent && conversation.talent_profiles?.is_published
              ? `/talent/${conversation.talent_profiles.slug}`
              : null,
          userId: other.user_id,
        }
      : null,
    job: conversation.jobs
      ? { title: conversation.jobs.title, slug: conversation.jobs.slug }
      : null,
    messages: (messages ?? []).map<ThreadMessage>((m) => ({
      id: m.id,
      body: m.redacted_reason ? 'This message was removed when the account was deleted.' : m.body,
      redacted: Boolean(m.redacted_reason),
      mine: m.sender_id === viewerUserId,
      createdAt: m.created_at,
      readAt: m.read_at,
    })),
    blocked,
  };
}

/** The badge in the dashboard nav. One count, not a list. */
export async function unreadCount(viewerUserId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .neq('sender_id', viewerUserId)
    .is('read_at', null);
  return count ?? 0;
}
