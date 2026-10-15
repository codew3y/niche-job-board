import { Type } from '@google/genai';
import { z } from 'zod';

/**
 * What resume extraction returns, in two forms:
 *   - RESUME_RESPONSE_SCHEMA constrains Gemini's JSON output;
 *   - `resumeDraft` re-validates it here, because a model's output is input like any other.
 *
 * Every field is optional or defaults to empty: a resume that has no education section must
 * produce an empty list, not an invented one. Dates are YYYY-MM (or empty) and lengths are capped
 * to what the profile forms accept, so nothing reaches the review screen that could not be saved.
 *
 * No server-only import: the review UI shares the types.
 */

export const RESUME_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    headline: { type: Type.STRING },
    summary: { type: Type.STRING },
    website: { type: Type.STRING },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING },
          company: { type: Type.STRING },
          start: { type: Type.STRING },
          end: { type: Type.STRING },
          current: { type: Type.BOOLEAN },
          description: { type: Type.STRING },
        },
        required: ['role', 'company'],
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          school: { type: Type.STRING },
          degree: { type: Type.STRING },
          startYear: { type: Type.INTEGER },
          endYear: { type: Type.INTEGER },
        },
        required: ['school'],
      },
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          role: { type: Type.STRING },
          outcome: { type: Type.STRING },
          techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
          links: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title'],
      },
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          issued: { type: Type.STRING },
          expires: { type: Type.STRING },
          credentialId: { type: Type.STRING },
          url: { type: Type.STRING },
        },
        required: ['name'],
      },
    },
  },
};

const text = (max: number) =>
  z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) => (v ?? '').replace(/\s+/g, ' ').trim().slice(0, max));

const longText = (max: number) =>
  z
    .string()
    .optional()
    .catch(undefined)
    .transform((v) =>
      (v ?? '')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max),
    );

/** YYYY-MM, or '' when the model gave nothing usable. A bare year becomes January. */
const month = z
  .string()
  .optional()
  .catch(undefined)
  .transform((v) => {
    const s = (v ?? '').trim();
    const m = /^(\d{4})(?:[-/](\d{1,2}))?/.exec(s);
    if (!m) return '';
    const year = Number(m[1]);
    const mon = m[2] ? Number(m[2]) : 1;
    if (year < 1950 || year > 2100 || mon < 1 || mon > 12) return '';
    return `${m[1]}-${String(mon).padStart(2, '0')}`;
  });

const year = z
  .number()
  .int()
  .min(1950)
  .max(2100)
  .optional()
  .catch(undefined)
  .transform((v) => v ?? null);

const https = z
  .string()
  .optional()
  .catch(undefined)
  .transform((v) => {
    const s = (v ?? '').trim();
    return /^https:\/\/[^\s]+$/i.test(s) ? s.replace(/\/+$/, '') : '';
  });

const list = <T extends z.ZodTypeAny>(item: T, max: number) =>
  z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((rows) =>
      (rows ?? [])
        .map((r) => item.safeParse(r))
        .filter((r) => r.success)
        .map((r) => r.data as z.infer<T>)
        .slice(0, max),
    );

export const resumeDraft = z.object({
  headline: text(120),
  summary: longText(4000),
  website: https,
  skills: z
    .array(z.unknown())
    .optional()
    .catch(undefined)
    .transform((v) =>
      [
        ...new Set(
          (v ?? [])
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && s.length <= 60),
        ),
      ].slice(0, 60),
    ),
  experience: list(
    z.object({
      role: text(120),
      company: text(120),
      start: month,
      end: month,
      current: z.boolean().optional().catch(undefined),
      description: longText(2000),
    }),
    20,
  ),
  education: list(
    z.object({
      school: text(160),
      degree: text(160),
      startYear: year,
      endYear: year,
    }),
    10,
  ),
  projects: list(
    z.object({
      title: text(120),
      description: longText(2000),
      role: text(120),
      outcome: longText(500),
      techStack: z
        .array(z.unknown())
        .optional()
        .catch(undefined)
        .transform((v) =>
          (v ?? [])
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim().slice(0, 60))
            .filter(Boolean)
            .slice(0, 20),
        ),
      links: z
        .array(z.unknown())
        .optional()
        .catch(undefined)
        .transform((v) =>
          (v ?? [])
            .filter((s): s is string => typeof s === 'string' && /^https:\/\/\S+$/i.test(s.trim()))
            .map((s) => s.trim())
            .slice(0, 10),
        ),
    }),
    10,
  ),
  certifications: list(
    z.object({
      name: text(200),
      issuer: text(160),
      issued: month,
      expires: month,
      credentialId: text(200),
      url: https,
    }),
    20,
  ),
});

export type ResumeDraft = z.infer<typeof resumeDraft>;
