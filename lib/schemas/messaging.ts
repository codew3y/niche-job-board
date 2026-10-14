import { z } from 'zod';

import { reportSubject } from './enums';
import { richText, trimmed, uuid } from './primitives';

/**
 * Messaging input — in v1 by owner decision (ADR-007 D1).
 *
 * Plain text only. No rich text, no attachments: the body is rendered as text, so there is
 * nothing to sanitise and no markup to escape. That is a deliberate narrowing of the attack
 * surface on a feature that has no human review queue behind it.
 */
export const startConversationInput = z.object({
  talentId: uuid,
  jobId: uuid.nullable().optional(),
  body: richText(5000, 'Message').min(1, 'Write a message.'),
});

export const sendMessageInput = z.object({
  conversationId: uuid,
  body: richText(5000, 'Message').min(1, 'Write a message.'),
});

export const blockInput = z.object({ userId: uuid });

export const reportInput = z.object({
  subjectType: reportSubject,
  subjectId: uuid,
  reason: trimmed.min(10, 'Tell us briefly what is wrong — at least 10 characters.').max(1000),
});

export type SendMessageInput = z.infer<typeof sendMessageInput>;
