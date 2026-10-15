import { z } from 'zod';

/**
 * Zod mirrors of the Postgres enums in backend/src/db/schema/enums.ts.
 *
 * These are declared literally rather than derived, so that reading either file tells you the
 * full vocabulary. The cost of duplication is drift, so `backend/src/schemas/enums.test.ts` asserts
 * the two lists match value-for-value — including order, since a reordered enum in Postgres
 * is a different type.
 */

export const activeRole = z.enum(['talent', 'client']);

export const availability = z.enum(['full_time', 'part_time', 'occasional', 'unavailable']);

export const engagementType = z.enum(['fixed', 'hourly', 'retainer']);

export const locationType = z.enum(['remote', 'hybrid', 'onsite']);

export const experienceLevel = z.enum(['junior', 'mid', 'senior', 'lead']);

export const jobStatus = z.enum(['draft', 'open', 'closed', 'filled']);

export const applicationStatus = z.enum([
  'applied',
  'viewed',
  'shortlisted',
  'rejected',
  'hired',
  'withdrawn',
]);

export const proficiency = z.enum(['familiar', 'proficient', 'expert']);

export const skillCategory = z.enum([
  'Languages',
  'Frontend',
  'Mobile',
  'Backend',
  'Data',
  'Cloud & DevOps',
  'Automation & integration',
  'Platforms & CMS',
  'AI/ML',
  'Practices',
]);

export const reportSubject = z.enum(['profile', 'job', 'message', 'conversation']);

export const notificationType = z.enum([
  'application_received',
  'application_status_changed',
  'strong_match',
  'message_received',
]);

/**
 * Which status changes each side may make (story M7).
 *
 * RLS cannot express column-level or value-level rules, so this table is the authority for
 * *who* may move an application *where*. The database enforces that both parties can write
 * the row at all; this decides what the write is allowed to say.
 */
export const allowedStatusTransitions = {
  client: {
    applied: ['viewed', 'shortlisted', 'rejected'],
    viewed: ['shortlisted', 'rejected'],
    shortlisted: ['hired', 'rejected'],
    rejected: [],
    hired: [],
    withdrawn: [],
  },
  talent: {
    // Talent can only withdraw, and only while the outcome is still open.
    applied: ['withdrawn'],
    viewed: ['withdrawn'],
    shortlisted: ['withdrawn'],
    rejected: [],
    hired: [],
    withdrawn: [],
  },
} as const satisfies Record<
  'client' | 'talent',
  Record<z.infer<typeof applicationStatus>, readonly z.infer<typeof applicationStatus>[]>
>;
