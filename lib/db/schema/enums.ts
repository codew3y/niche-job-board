import { pgEnum } from 'drizzle-orm/pg-core';

// Enums are the vocabulary the whole app agrees on. Adding a value is a migration,
// which is the point — it makes "we quietly added a status" impossible.

export const activeRole = pgEnum('active_role', ['talent', 'client']);

export const availability = pgEnum('availability', [
  'full_time',
  'part_time',
  'occasional',
  'unavailable',
]);

export const engagementType = pgEnum('engagement_type', ['fixed', 'hourly', 'retainer']);

export const locationType = pgEnum('location_type', ['remote', 'hybrid', 'onsite']);

export const experienceLevel = pgEnum('experience_level', ['junior', 'mid', 'senior', 'lead']);

export const jobStatus = pgEnum('job_status', ['draft', 'open', 'closed', 'filled']);

export const applicationStatus = pgEnum('application_status', [
  'applied',
  'viewed',
  'shortlisted',
  'rejected',
  'hired',
  'withdrawn',
]);

export const proficiency = pgEnum('proficiency', ['familiar', 'proficient', 'expert']);

/** Mirrors lib/seeds/skills.seed.ts SkillCategory. Kept in sync by a test. */
export const skillCategory = pgEnum('skill_category', [
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

export const reportSubject = pgEnum('report_subject', [
  'profile',
  'job',
  'message',
  'conversation',
]);

export const notificationType = pgEnum('notification_type', [
  'application_received',
  'application_status_changed',
  'strong_match',
  'message_received',
]);
