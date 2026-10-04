import 'server-only';

import { GoogleGenAI } from '@google/genai';
import { extractText, getDocumentProxy } from 'unpdf';

import { serverEnv } from '../env';
import { reserveCall } from '../matching/budget';
import { RERANK_MODEL } from '../matching/config';
import { createClient } from '../supabase/server';
import { redactContactDetails } from './redact';
import { buildResumePrompt } from './resume-prompt';
import { RESUME_RESPONSE_SCHEMA, resumeDraft, type ResumeDraft } from './resume-schema';

/**
 * Resume → draft profile sections.
 *
 * The file is read in memory and never stored: its bytes exist only for the length of this call.
 * Text is extracted here (unpdf), contact details are removed (redact.ts), and only that text is
 * sent to Gemini. The draft comes back to the person's own browser for review; nothing is written
 * to their profile until they choose what to keep (lib/actions/resume-import.ts).
 *
 * Limits, checked in this order so a refused request costs nothing:
 *   size and type → per-person daily allowance → site-wide daily AI budget → Gemini.
 */

/** Below Vercel's 4.5 MB request cap and the 4 MB server-action limit in next.config.ts. */
export const MAX_RESUME_BYTES = 3 * 1024 * 1024;
export const RESUME_IMPORTS_PER_PERSON_PER_DAY = 10;
/** Enough for a long resume; a 30-page document is not a resume. */
const MAX_TEXT_CHARS = 30_000;
const MAX_PAGES = 10;

export type ExtractResult = { ok: true; draft: ResumeDraft } | { ok: false; message: string };

let client: GoogleGenAI | null = null;
const genai = (apiKey: string) => (client ??= new GoogleGenAI({ apiKey }));

/** A real PDF starts with "%PDF-". The file name and the browser's type are both just claims. */
const isPdf = (bytes: Uint8Array) =>
  bytes.length > 5 &&
  bytes[0] === 0x25 &&
  bytes[1] === 0x50 &&
  bytes[2] === 0x44 &&
  bytes[3] === 0x46 &&
  bytes[4] === 0x2d;

export async function extractResume(file: File): Promise<ExtractResult> {
  if (file.size === 0) return { ok: false, message: 'That file is empty.' };
  if (file.size > MAX_RESUME_BYTES) {
    return { ok: false, message: 'That file is over 3 MB. Export a smaller PDF and try again.' };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) {
    return {
      ok: false,
      message: 'Upload your resume as a PDF. In Word or Google Docs, use File → Download → PDF.',
    };
  }

  let text: string;
  try {
    const pdf = await getDocumentProxy(bytes);
    if (pdf.numPages > MAX_PAGES) {
      return {
        ok: false,
        message: `That PDF has ${pdf.numPages} pages. A resume of up to ${MAX_PAGES} works.`,
      };
    }
    const result = await extractText(pdf, { mergePages: true });
    text = Array.isArray(result.text) ? result.text.join('\n') : result.text;
  } catch {
    return {
      ok: false,
      message: 'Could not read that PDF. If it is password-protected, remove the password.',
    };
  }

  text = text.replace(/\u0000/g, '').trim();
  if (text.length < 200) {
    // A scanned resume is an image of text; there is nothing here to read.
    return {
      ok: false,
      message:
        'There is almost no text in that PDF. It may be a scan or a picture. Export it from the original document instead.',
    };
  }
  const redacted = redactContactDetails(text).slice(0, MAX_TEXT_CHARS);

  /**
   * Test hook: end-to-end tests cannot call Gemini, so RESUME_IMPORT_FIXTURE (a path to a JSON
   * draft, set only by playwright.config.ts) stands in for the model's answer. Ignored on Vercel,
   * so no deployed environment can be pointed at it. Everything else, including both limits and
   * the validation of the answer, runs as normal.
   */
  const fixture = process.env.VERCEL ? undefined : process.env.RESUME_IMPORT_FIXTURE;

  const { GEMINI_API_KEY } = serverEnv();
  if (!GEMINI_API_KEY && !fixture) {
    return { ok: false, message: 'Resume import is not available right now.' };
  }

  // Per person first: someone over their own limit should not spend a unit of the site budget.
  const supabase = await createClient();
  const { data: allowed, error: limitError } = await supabase.rpc('reserve_resume_import', {
    p_limit: RESUME_IMPORTS_PER_PERSON_PER_DAY,
  });
  if (limitError || allowed !== true) {
    return {
      ok: false,
      message: `You can import a resume ${RESUME_IMPORTS_PER_PERSON_PER_DAY} times a day. Try again tomorrow, or fill your profile in by hand.`,
    };
  }
  if (!(await reserveCall('resume_import'))) {
    return { ok: false, message: 'Resume import is busy today. Try again tomorrow.' };
  }

  const raw = fixture
    ? await import('node:fs/promises').then((fs) => fs.readFile(fixture, 'utf8'))
    : await askGemini(GEMINI_API_KEY!, redacted);
  if (raw === null) {
    return { ok: false, message: 'Could not read your resume just now. Try again in a minute.' };
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, message: 'Could not read your resume just now. Try again in a minute.' };
  }
  const parsed = resumeDraft.safeParse(json);
  if (!parsed.success) {
    return { ok: false, message: 'Could not read your resume just now. Try again in a minute.' };
  }
  return { ok: true, draft: parsed.data };
}

/** The model call. null on any failure; the caller turns that into one plain message. */
async function askGemini(apiKey: string, resumeText: string): Promise<string | null> {
  try {
    const response = await genai(apiKey).models.generateContent({
      model: RERANK_MODEL,
      contents: buildResumePrompt(resumeText),
      config: {
        responseMimeType: 'application/json',
        responseSchema: RESUME_RESPONSE_SCHEMA,
        // Extraction should be repeatable: the same resume gives the same draft.
        temperature: 0,
      },
    });
    return response.text ?? '';
  } catch (cause) {
    console.warn(`[resume-import] Gemini failed: ${String(cause).slice(0, 200)}`);
    return null;
  }
}
