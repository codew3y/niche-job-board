/**
 * Run the hand-labelled eval set against the real embedding model.
 *
 * `npm run eval` — costs a handful of free-tier requests and takes about a minute.
 *
 * This is the instrument the Phase 4 exit asks for, and it exists so the Phase 4 exit is
 * measured rather than asserted. It deliberately maps the eval fixtures through the SAME
 * `jobToText` / `talentToText` builders production uses: an eval that embeds its own
 * specially-formatted text measures a pipeline nobody ships.
 *
 * Read the output as a diagnosis, not a score. nDCG says whether the ORDER is right;
 * precision@1 says whether the single best candidate wins; the J5 calibration case says
 * whether the system knows when it has found nothing good. Those fail independently and for
 * different reasons, which is the whole reason there are four gates rather than one.
 */

import { GoogleGenAI } from '@google/genai';

import {
  calibrationJobs,
  evalGates,
  evalJobs,
  evalProfiles,
  gradesForJob,
  gradesForProfile,
  ndcgAt,
  precisionAt1,
  type EvalJob,
  type EvalProfile,
} from './match-eval-set';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  EMBEDDING_TASK_TYPE,
  RERANK_MODEL,
} from '../matching/config';
import { parseRerank } from '../matching/rerank-parse';
import { RERANK_RESPONSE_SCHEMA, buildRerankPrompt } from '../matching/rerank-prompt';
import { jobToText, talentToText } from '../matching/text';

/** Skill slugs are stored kebab-case; the text builders expect human names. */
const humanise = (slug: string) => slug.replace(/-/g, ' ');

export const evalJobText = (job: EvalJob) =>
  jobToText({
    title: job.title,
    description: job.brief,
    skills: job.skills.map((s) => ({ name: humanise(s), isRequired: true })),
    engagementType: job.engagement,
  });

export const evalProfileText = (profile: EvalProfile) =>
  talentToText({
    headline: profile.name,
    bio: profile.bio,
    skills: profile.skills.map((s) => ({ name: humanise(s) })),
    items: profile.items.map((item) => ({ title: item, description: item })),
  });

/** Cosine similarity. Both sides are unit vectors, so this is a plain dot product. */
export const cosine = (a: number[], b: number[]) => a.reduce((sum, x, i) => sum + x * b[i]!, 0);

export type Pass = { name: string; value: number; gate: number; pass: boolean };

export type EvalReport = {
  /** Vector similarity alone — no re-ranker. The baseline the re-ranker has to beat. */
  vectorOnly: {
    clientNdcgAt5: number;
    talentNdcgAt3: number;
    precisionAt1: number;
    calibrationTopScore: number;
  };
  /** The full pipeline, which is what ships. Gates are judged on this. */
  reranked: { clientNdcgAt5: number; precisionAt1: number; calibrationTopScore: number } | null;
  perJob: { id: string; ndcg5: number; p1: number; top3: string[] }[];
  passes: Pass[];
};

/**
 * Run the set twice: vector-only, then re-ranked.
 *
 * Both numbers are reported because the comparison IS the finding. Vector-only already ranks
 * correctly and cannot calibrate; the re-ranker trades a hair of ordering accuracy for a
 * score that means something. Reporting only the final number would hide which stage is
 * earning its place — and if the re-ranker ever stops earning it, that shows up here.
 */
export async function runEval(apiKey: string): Promise<EvalReport> {
  const ai = new GoogleGenAI({ apiKey });

  const embed = async (text: string) => {
    const response = await ai.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: text,
      config: { outputDimensionality: EMBEDDING_DIMENSIONS, taskType: EMBEDDING_TASK_TYPE },
    });
    const values = response.embeddings?.[0]?.values;
    if (!values) throw new Error('no embedding returned');
    return values;
  };

  const jobVectors = new Map<string, number[]>();
  for (const job of evalJobs) jobVectors.set(job.id, await embed(evalJobText(job)));
  const profileVectors = new Map<string, number[]>();
  for (const p of evalProfiles) profileVectors.set(p.id, await embed(evalProfileText(p)));

  const rankProfilesFor = (jobId: string) =>
    evalProfiles
      .map((p) => ({ id: p.id, score: cosine(jobVectors.get(jobId)!, profileVectors.get(p.id)!) }))
      .sort((a, b) => b.score - a.score);

  const perJob: EvalReport['perJob'] = [];
  const ndcg5: number[] = [];
  let p1Hits = 0;
  let p1Total = 0;
  let calibrationTopScore = 0;

  for (const job of evalJobs) {
    const ranked = rankProfilesFor(job.id);
    const ids = ranked.map((r) => r.id);

    if (calibrationJobs.includes(job.id as never)) {
      // J5 has no good match by construction. What is measured is whether the system KNOWS
      // that — a confident score here is the failure, regardless of ordering.
      calibrationTopScore = Math.round((ranked[0]?.score ?? 0) * 100);
      continue;
    }

    const grades = gradesForJob(job.id);
    const n5 = ndcgAt(ids, grades, 5);
    const p1 = precisionAt1(ids, grades);
    ndcg5.push(n5);
    p1Total++;
    p1Hits += p1;
    perJob.push({ id: job.id, ndcg5: n5, p1, top3: ids.slice(0, 3) });
  }

  const ndcg3: number[] = [];
  for (const profile of evalProfiles) {
    const ids = evalJobs
      .map((j) => ({
        id: j.id,
        score: cosine(profileVectors.get(profile.id)!, jobVectors.get(j.id)!),
      }))
      .sort((a, b) => b.score - a.score)
      .map((r) => r.id);
    ndcg3.push(ndcgAt(ids, gradesForProfile(profile.id), 3));
  }

  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const vectorOnly = {
    clientNdcgAt5: mean(ndcg5),
    talentNdcgAt3: mean(ndcg3),
    precisionAt1: p1Total ? p1Hits / p1Total : 0,
    calibrationTopScore,
  };

  /**
   * Second pass: the same candidates through the real re-rank prompt.
   *
   * Every profile is sent rather than a retrieved top-20, because the eval set is ten
   * profiles — retrieval would be a no-op and would only hide which stage produced which
   * number.
   */
  const rerankCandidates = evalProfiles.map((p) => ({
    id: p.id,
    text: evalProfileText(p),
    similarity: 0,
  }));

  const rerankedNdcg5: number[] = [];
  let rerankedHits = 0;
  let rerankedTotal = 0;
  let rerankedCalibration = 0;
  let rerankFailed = false;

  for (const job of evalJobs) {
    /**
     * Retried, and caught. The free tier returns 503 "experiencing high demand" often enough
     * that an eval which crashes on one is an eval nobody can run — and production has the
     * same exposure, which is why the original matching design requires a fallback rather than treating the
     * re-ranker as reliable.
     */
    let parsed = null as ReturnType<typeof parseRerank> | null;
    for (let attempt = 1; attempt <= 3 && !parsed?.ok; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: RERANK_MODEL,
          contents: buildRerankPrompt(evalJobText(job), rerankCandidates),
          config: {
            responseMimeType: 'application/json',
            responseSchema: RERANK_RESPONSE_SCHEMA,
            temperature: 0,
          },
        });
        parsed = parseRerank(response.text ?? '', rerankCandidates);
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        console.warn(
          `  [eval] ${job.id} re-rank attempt ${attempt} failed: ${detail.slice(0, 120)}`,
        );
        if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }

    if (!parsed?.ok) {
      // A pipeline that cannot re-rank falls back to vector order in production; here it is
      // reported as a failure rather than quietly measured as if it had worked.
      rerankFailed = true;
      break;
    }

    if (calibrationJobs.includes(job.id as never)) {
      rerankedCalibration = parsed.items[0]?.score ?? 0;
      continue;
    }
    const ids = parsed.items.map((i) => i.id);
    const grades = gradesForJob(job.id);
    rerankedNdcg5.push(ndcgAt(ids, grades, 5));
    rerankedTotal++;
    rerankedHits += precisionAt1(ids, grades);
  }

  const reranked = rerankFailed
    ? null
    : {
        clientNdcgAt5: mean(rerankedNdcg5),
        precisionAt1: rerankedTotal ? rerankedHits / rerankedTotal : 0,
        calibrationTopScore: rerankedCalibration,
      };

  // Gates are judged on the FULL pipeline, because that is what ships. Talent-direction nDCG
  // has no re-rank pass in this harness, so it is judged on the vectors that produce it.
  const judged = reranked ?? {
    clientNdcgAt5: vectorOnly.clientNdcgAt5,
    precisionAt1: vectorOnly.precisionAt1,
    calibrationTopScore: vectorOnly.calibrationTopScore,
  };

  return {
    vectorOnly,
    reranked,
    perJob,
    passes: [
      {
        name: 'nDCG@5 (client)',
        value: judged.clientNdcgAt5,
        gate: evalGates.clientNdcgAt5,
        pass: judged.clientNdcgAt5 >= evalGates.clientNdcgAt5,
      },
      {
        name: 'nDCG@3 (talent)',
        value: vectorOnly.talentNdcgAt3,
        gate: evalGates.talentNdcgAt3,
        pass: vectorOnly.talentNdcgAt3 >= evalGates.talentNdcgAt3,
      },
      {
        name: 'precision@1',
        value: judged.precisionAt1,
        gate: evalGates.precisionAt1,
        pass: judged.precisionAt1 >= evalGates.precisionAt1,
      },
      // The only gate that is an upper bound: J5 must NOT look like a strong match.
      {
        name: 'J5 calibration (max)',
        value: judged.calibrationTopScore,
        gate: evalGates.calibrationMaxScore,
        pass: judged.calibrationTopScore < evalGates.calibrationMaxScore,
      },
    ],
  };
}
