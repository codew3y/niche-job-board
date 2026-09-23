import { Type } from '@google/genai';

/**
 * The scoring rubric and response schema, in a module with no `server-only` import.
 *
 * Shared by the re-ranker and by `npm run eval`. The eval MUST use the same prompt production
 * uses — an eval that scores with its own rubric measures a system nobody ships, which is the
 * mistake the text builders already avoid by being shared the same way.
 *
 * Bands are stated explicitly, with permission to score low. Without them a model clusters
 * everything in the 70-90 range: "rate this 0-100" invites the same agreeableness that makes
 * raw cosine useless. Naming what 0-24 means, and saying outright that most candidates are not
 * strong, is what makes the bottom of the scale reachable — and it is what took the J5
 * calibration case from 78 to 45.
 */
export const RERANK_RUBRIC = `Score each candidate 0-100 on how well they fit THIS brief specifically.

  85-100  Has demonstrably done this exact work before, with evidence.
  70-84   Strong overlap; has done closely related work.
  50-69   Plausible. Adjacent experience, would need to learn parts of it.
  25-49   Weak. Shares vocabulary or tools but not the actual work.
  0-24    Not a fit.

Most candidates are NOT strong. A brief with no good candidate must produce no score above
69 — saying "nothing here fits" is a correct and useful answer, and inflating a weak match is
worse than returning none.

Judge EVIDENCE over CLAIMS. Someone listing a skill is not the same as someone who has shipped
work using it. A candidate whose projects show the work outranks one whose tag list mentions
it, every time.

For each candidate give one sentence of reasoning, written to the reader of the brief, naming
the specific thing that earned the score. Never mention scores, percentages or rankings in the
sentence — it is shown without the number.`;

export const RERANK_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    candidates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          score: { type: Type.INTEGER },
          reason: { type: Type.STRING },
        },
        required: ['id', 'score', 'reason'],
      },
    },
  },
  required: ['candidates'],
};

/** Build the prompt. Shared so eval and production cannot drift. */
export function buildRerankPrompt(
  brief: string,
  candidates: { id: string; text: string }[],
): string {
  return [
    RERANK_RUBRIC,
    '',
    '--- THE BRIEF ---',
    brief,
    '',
    '--- CANDIDATES ---',
    ...candidates.map((c, i) => `[${i + 1}] id=${c.id}\n${c.text}`),
  ].join('\n');
}
