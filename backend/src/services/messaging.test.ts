/**
 * Messaging is the highest-consequence RLS surface in the product: a leak here exposes private
 * correspondence between two people, not a draft job post.
 *
 * These tests are written against the DATABASE, not the service layer, because the service
 * layer deliberately contains no participant filtering (backend/src/services/messaging.ts explains
 * why). If the policies below are wrong, the application has nothing else standing between a
 * stranger and someone's inbox.
 *
 * The block tests are the ones to read twice. A block that "works" by hiding the button, or by
 * a check that the sender can defeat, is the failure mode this feature shipped with in
 * Phase 1 — the policy's block subquery ran as the sender and was therefore filtered by
 * `blocks`' own RLS, so a blocked sender saw zero blocks against themselves and sent anyway.
 * Migration 0003 moved it into public.is_blocked(), a SECURITY DEFINER function.
 */

import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';

import { itAnnouncesTarget } from '../db/test-target';

const DB_URL =
  process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql: postgres.Sql = postgres(DB_URL, {
  max: 2,
  idle_timeout: 5,
  connect_timeout: 5,
  onnotice: () => {},
});
const reachable = await sql`select 1`.then(
  () => {
    // Announce the target. Reporting green without saying WHICH database was measured is how
    // a hosted verification silently becomes a local one — the failure that made every DB
    // suite here print this line.
    console.info(`[messaging.test] connected to ${DB_URL.replace(/:[^:@]+@/, ':****@')}`);
    return true;
  },
  (e: Error) => {
    // Never swallow the reason: a silent skip hides a broken database as well as a broken
    // test does.
    console.warn(`[messaging.test] skipping — cannot reach ${DB_URL}: ${e.message}`);
    return false;
  },
);

const CLIENT = '21212121-2121-4121-8121-212121212121';
const TALENT = '31313131-3131-4131-8131-313131313131';
const STRANGER = '41414141-4141-4141-8141-414141414141';
const QUIET = '51515151-5151-4151-8151-515151515151';

let ids = { client: '', talent: '', quiet: '', job: '', conversation: '' };

async function mkUser(id: string, email: string) {
  await sql`insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
            values (${id}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', ${email}, 'x', now(), now())`;
  await sql`insert into user_profiles (user_id, display_name) values (${id}, ${email})`;
}

async function asUser<T>(
  userId: string,
  fn: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx.unsafe('SET LOCAL ROLE authenticated');
    await tx`select set_config('request.jwt.claim.sub', ${userId}, true)`;
    await tx`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: 'authenticated' })}, true)`;
    return fn(tx);
  }) as Promise<T>;
}

const BIO = 'b'.repeat(200);

async function reset() {
  await sql`delete from auth.users where id in (${CLIENT}, ${TALENT}, ${STRANGER}, ${QUIET})`;
  await mkUser(CLIENT, 'msg-client@example.test');
  await mkUser(TALENT, 'msg-talent@example.test');
  await mkUser(STRANGER, 'msg-stranger@example.test');
  await mkUser(QUIET, 'msg-quiet@example.test');

  const [c] =
    await sql`insert into client_profiles (user_id, company_name) values (${CLIENT}, 'Hiring Co') returning id`;
  const [t] =
    await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published, accepts_messages)
    values (${TALENT}, 'msg-talent', 'Rust systems developer', ${BIO}, 'https://e.test/t', true, true) returning id`;
  // Published, but has messaging switched off.
  const [q] =
    await sql`insert into talent_profiles (user_id, slug, headline, bio, website_url, is_published, accepts_messages)
    values (${QUIET}, 'msg-quiet', 'Go developer, not looking', ${BIO}, 'https://e.test/q', true, false) returning id`;
  const [j] =
    await sql`insert into jobs (client_id, title, slug, description, engagement_type, status, published_at)
    values (${c!.id}, 'Rust role', 'msg-rust-role', 'desc', 'fixed', 'open', now()) returning id`;

  const [v] =
    await sql`insert into conversations (client_id, talent_id, job_id) values (${c!.id}, ${t!.id}, ${j!.id}) returning id`;
  await sql`insert into messages (conversation_id, sender_id, body) values (${v!.id}, ${CLIENT}, 'Interested in your Rust work.')`;

  ids = { client: c!.id, talent: t!.id, quiet: q!.id, job: j!.id, conversation: v!.id };
}

afterAll(async () => {
  if (reachable)
    await sql`delete from auth.users where id in (${CLIENT}, ${TALENT}, ${STRANGER}, ${QUIET})`;
  await sql.end();
});

itAnnouncesTarget(sql, DB_URL);

const maybe = reachable ? describe : describe.skip;

maybe('conversations — who can see a thread', () => {
  beforeEach(reset);

  it('both participants see it', async () => {
    const asClient = await asUser(CLIENT, (tx) => tx`select id from conversations`);
    const asTalent = await asUser(TALENT, (tx) => tx`select id from conversations`);
    expect(asClient).toHaveLength(1);
    expect(asTalent).toHaveLength(1);
  });

  it('A STRANGER SEES NOTHING, even knowing the id', async () => {
    const rows = await asUser(
      STRANGER,
      (tx) => tx`select id from conversations where id = ${ids.conversation}`,
    );
    expect(rows).toHaveLength(0);
  });

  it('A STRANGER CANNOT READ THE MESSAGES, even knowing the conversation id', async () => {
    // The reason the thread page returns 404 rather than 403: RLS returns no row at all, so
    // there is nothing to distinguish "not yours" from "does not exist".
    const rows = await asUser(
      STRANGER,
      (tx) => tx`select body from messages where conversation_id = ${ids.conversation}`,
    );
    expect(rows).toHaveLength(0);
  });

  it('a stranger cannot insert themselves into someone else’s thread', async () => {
    await expect(
      asUser(
        STRANGER,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${STRANGER}, 'let me in')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a participant cannot forge a message from the other participant', async () => {
    // sender_id = auth.uid() is in the WITH CHECK, so "who sent this" is not client-supplied.
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${TALENT}, 'I accept, signed the developer')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('the talent cannot open a conversation — only a client can', async () => {
    await expect(
      asUser(
        TALENT,
        (tx) =>
          tx`insert into conversations (client_id, talent_id) values (${ids.client}, ${ids.talent})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a client cannot message a profile that has messages turned off', async () => {
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into conversations (client_id, talent_id) values (${ids.client}, ${ids.quiet})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a client cannot message an unpublished profile', async () => {
    await sql`update talent_profiles set is_published = false where id = ${ids.talent}`;
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into conversations (client_id, talent_id) values (${ids.client}, ${ids.talent})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('two general-enquiry threads between the same pair are refused', async () => {
    // Postgres treats NULLs as distinct in a UNIQUE constraint, so the composite unique does
    // NOT cover job_id IS NULL. conversations_general_unique (migration 0001) does.
    await sql`insert into conversations (client_id, talent_id, job_id) values (${ids.client}, ${ids.talent}, null)`;
    await expect(
      sql`insert into conversations (client_id, talent_id, job_id) values (${ids.client}, ${ids.talent}, null)`,
    ).rejects.toThrow(/duplicate key|conversations_general_unique/i);
  });

  it('a second thread about the SAME job is refused', async () => {
    await expect(
      sql`insert into conversations (client_id, talent_id, job_id) values (${ids.client}, ${ids.talent}, ${ids.job})`,
    ).rejects.toThrow(/duplicate key|conversations_participants_unique/i);
  });
});

maybe('blocks — the control that carries moderation in v1', () => {
  beforeEach(reset);

  it('A BLOCKED SENDER CANNOT SEND, and the check is not one they can defeat', async () => {
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${CLIENT}, 'hello again')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('A BLOCKED SENDER CANNOT SEE THAT THEY WERE BLOCKED', async () => {
    // The whole design rests on this. Someone who can detect a block opens a second account.
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    const seen = await asUser(CLIENT, (tx) => tx`select * from blocks`);
    expect(seen).toHaveLength(0);

    // Nor by asking the targeted question.
    const targeted = await asUser(
      CLIENT,
      (tx) => tx`select * from blocks where blocked_id = ${CLIENT}`,
    );
    expect(targeted).toHaveLength(0);
  });

  it('the block is re-checked per message, not only when the thread opened', async () => {
    // The thread already has a message in it from reset(), sent before the block existed.
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${CLIENT}, 'still here')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('THE BLOCKER ALSO STOPS BEING ABLE TO WRITE — a block is mutual', async () => {
    // This test failed when first written: the policy asked only "has the other party blocked
    // me", so whoever blocked first kept a working channel to someone who could no longer
    // reply. Migration 0010 made it mutual. A block is an exit, not a megaphone.
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    await expect(
      asUser(
        TALENT,
        (tx) =>
          tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${TALENT}, 'and another thing')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a block also stops a NEW conversation being opened', async () => {
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    await expect(
      asUser(
        CLIENT,
        (tx) =>
          tx`insert into conversations (client_id, talent_id, job_id) values (${ids.client}, ${ids.talent}, null)`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('unblocking restores the ability to send', async () => {
    await asUser(
      TALENT,
      (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
    );
    await asUser(
      TALENT,
      (tx) => tx`delete from blocks where blocker_id = ${TALENT} and blocked_id = ${CLIENT}`,
    );
    const sent = await asUser(
      CLIENT,
      (tx) =>
        tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${CLIENT}, 'back') returning id`,
    );
    expect(sent).toHaveLength(1);
  });

  it('nobody can block on someone else’s behalf', async () => {
    await expect(
      asUser(
        STRANGER,
        (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${TALENT}, ${CLIENT})`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('you cannot block yourself', async () => {
    await expect(
      asUser(
        CLIENT,
        (tx) => tx`insert into blocks (blocker_id, blocked_id) values (${CLIENT}, ${CLIENT})`,
      ),
    ).rejects.toThrow(/block_not_self/i);
  });
});

maybe('read receipts and message bodies', () => {
  beforeEach(reset);

  it('the recipient can stamp read_at', async () => {
    const updated = await asUser(
      TALENT,
      (tx) =>
        tx`update messages set read_at = now() where conversation_id = ${ids.conversation} returning id`,
    );
    expect(updated).toHaveLength(1);
  });

  it('THE SENDER CANNOT STAMP THEIR OWN MESSAGE AS READ', async () => {
    // Otherwise "Read" on a sent message means nothing at all.
    const updated = await asUser(
      CLIENT,
      (tx) =>
        tx`update messages set read_at = now() where conversation_id = ${ids.conversation} returning id`,
    );
    expect(updated).toHaveLength(0);
  });

  it('a stranger cannot stamp anything in a thread they are not in', async () => {
    const updated = await asUser(
      STRANGER,
      (tx) => tx`update messages set read_at = now() returning id`,
    );
    expect(updated).toHaveLength(0);
  });

  it('an empty message is refused by the length check, not just by the form', async () => {
    await expect(
      sql`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${CLIENT}, '')`,
    ).rejects.toThrow(/message_body_length/i);
  });

  it('a message over 5000 characters is refused', async () => {
    await expect(
      sql`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${CLIENT}, ${'x'.repeat(5001)})`,
    ).rejects.toThrow(/message_body_length/i);
  });

  it('sending bumps last_message_at, which is what orders the inbox', async () => {
    const [before] =
      await sql`select last_message_at from conversations where id = ${ids.conversation}`;
    await asUser(
      TALENT,
      (tx) =>
        tx`insert into messages (conversation_id, sender_id, body) values (${ids.conversation}, ${TALENT}, 'replying')`,
    );
    const [after] =
      await sql`select last_message_at from conversations where id = ${ids.conversation}`;
    expect(new Date(after!.last_message_at).getTime()).toBeGreaterThanOrEqual(
      new Date(before!.last_message_at).getTime(),
    );
  });
});

maybe('reports — write-only to everyone but the reporter', () => {
  beforeEach(reset);

  it('a reporter can file one and read their own', async () => {
    await asUser(
      TALENT,
      (tx) =>
        tx`insert into reports (reporter_id, subject_type, subject_id, reason)
           values (${TALENT}, 'conversation', ${ids.conversation}, 'Unsolicited and abusive.')`,
    );
    const own = await asUser(TALENT, (tx) => tx`select * from reports`);
    expect(own).toHaveLength(1);
  });

  it('THE REPORTED PARTY CANNOT SEE THEY WERE REPORTED', async () => {
    await asUser(
      TALENT,
      (tx) =>
        tx`insert into reports (reporter_id, subject_type, subject_id, reason)
           values (${TALENT}, 'conversation', ${ids.conversation}, 'Unsolicited and abusive.')`,
    );
    const seen = await asUser(CLIENT, (tx) => tx`select * from reports`);
    expect(seen).toHaveLength(0);
  });

  it('nobody can file a report in someone else’s name', async () => {
    await expect(
      asUser(
        STRANGER,
        (tx) =>
          tx`insert into reports (reporter_id, subject_type, subject_id, reason)
             values (${TALENT}, 'conversation', ${ids.conversation}, 'framing them')`,
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('a reporter cannot mark their own report resolved', async () => {
    // There is no update policy at all; resolution happens through the service role.
    await asUser(
      TALENT,
      (tx) =>
        tx`insert into reports (reporter_id, subject_type, subject_id, reason)
           values (${TALENT}, 'conversation', ${ids.conversation}, 'Unsolicited and abusive.')`,
    );
    const updated = await asUser(
      TALENT,
      (tx) => tx`update reports set resolved_at = now() returning id`,
    );
    expect(updated).toHaveLength(0);
  });
});

maybe('account deletion leaves the other party’s record intact', () => {
  beforeEach(reset);

  it('the thread survives, the sender is tombstoned, the body is redacted', async () => {
    await sql`delete from auth.users where id = ${CLIENT}`;

    const [conversation] = await sql`select * from conversations where id = ${ids.conversation}`;
    expect(conversation).toBeDefined();
    expect(conversation!.client_id).toBeNull();

    const [message] = await sql`select * from messages where conversation_id = ${ids.conversation}`;
    expect(message).toBeDefined();
    expect(message!.sender_id).toBeNull();
    expect(message!.redacted_reason).toBeTruthy();
  });

  it('the surviving participant can still open the thread', async () => {
    await sql`delete from auth.users where id = ${CLIENT}`;
    const rows = await asUser(
      TALENT,
      (tx) => tx`select id from conversations where id = ${ids.conversation}`,
    );
    expect(rows).toHaveLength(1);
  });

  it('nobody inherits the deleted side of the thread', async () => {
    await sql`delete from auth.users where id = ${CLIENT}`;
    const rows = await asUser(
      STRANGER,
      (tx) => tx`select id from conversations where id = ${ids.conversation}`,
    );
    expect(rows).toHaveLength(0);
  });
});
