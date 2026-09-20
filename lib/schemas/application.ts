import { z } from 'zod';

import { allowedStatusTransitions, applicationStatus } from './enums';
import { richText, uuid } from './primitives';

export const applyInput = z.object({
  jobId: uuid,
  coverNote: richText(2000, 'Cover note').min(
    40,
    'Say why you fit in at least 40 characters — a blank application reads as a bulk send.',
  ),
});

/**
 * A status change is validated against WHO is making it and WHERE it is coming from.
 * RLS proves both parties may write the row; this decides whether the transition is legal.
 * Without it, a client could move an application straight from `applied` to `hired`, or
 * reopen one they already rejected.
 */
export const statusChangeInput = z
  .object({
    applicationId: uuid,
    actor: z.enum(['client', 'talent']),
    from: applicationStatus,
    to: applicationStatus,
  })
  .refine((v) => (allowedStatusTransitions[v.actor][v.from] as readonly string[]).includes(v.to), {
    path: ['to'],
    message: 'That status change is not allowed from here.',
  });

export type ApplyInput = z.infer<typeof applyInput>;
