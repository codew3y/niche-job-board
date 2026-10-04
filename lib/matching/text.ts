/**
 * Text representations for embedding.
 *
 * This is where match quality actually lives (PROJECT.md §8). The model is fixed —
 * `text-embedding-3-small`, frozen into `vector(1536)` by ADR-002 — so the only lever left is
 * what text it reads. Iterate here before reaching for a bigger model.
 *
 * Four rules, each of which came out of the eval set rather than taste:
 *
 * 1. LABEL THE FIELDS. "Skills: Stripe, Postgres" embeds differently from a bare list, because
 *    the label gives the model a relation rather than a bag of nouns. Cheap, and it is what
 *    lets a job's "Required skills" line up against a profile's "Skills" line.
 *
 * 2. EVIDENCE OUTRANKS CLAIMS. A profile's shipped work goes in before its skill tags. The
 *    distractor case (docs/eval-set.md §4, G3) is a developer who lists the right skills and
 *    has shipped none of them — if tags dominate the text, that profile wins, and the whole
 *    product proposition fails while the metric still looks fine.
 *
 * 3. NEVER PAD WITH A URL. A link is not text the system can read. Including
 *    "https://maya.dev" adds tokens that carry no meaning and dilutes everything around them.
 *    The thin-profile case (P5) must read as thin, because it IS thin — hiding that behind
 *    filler produces a profile that matches confidently and wrongly.
 *
 * 4. NO INVENTED CONTENT. Nothing here writes text the user did not. Padding a sparse profile
 *    with a generated summary would embed a guess and rank it as fact.
 */

/** `text-embedding-3-small` accepts 8191 tokens. This is a deliberately conservative cap. */
const MAX_CHARS = 8000;

export type TalentForText = {
  headline: string;
  bio: string | null;
  skills: { name: string; proficiency?: string | null; years?: number | null }[];
  items: ItemForText[];
  /** Certification names with their issuer (migration 0022). Public, and a real signal. */
  certifications?: { name: string; issuer: string }[];
  availability?: string | null;
  yearsExperience?: number | null;
  timezone?: string | null;
};

export type ItemForText = {
  title: string;
  description: string;
  role?: string | null;
  outcome?: string | null;
  techStack?: string[];
};

export type JobForText = {
  title: string;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  skills: { name: string; isRequired: boolean }[];
  engagementType?: string | null;
  locationType?: string | null;
  experienceLevel?: string | null;
};

const clean = (v: string | null | undefined): string => (v ?? '').replace(/\s+/g, ' ').trim();

/** Drop empty sections entirely. A line reading "Outcome:" with nothing after it is noise. */
function section(label: string, body: string): string | null {
  const value = clean(body);
  return value ? `${label}: ${value}` : null;
}

/**
 * One portfolio item.
 *
 * Outcome is given its own labelled line rather than being folded into the description,
 * because it is the field that distinguishes "I used Stripe" from "I cut failed payments from
 * 4.1% to 0.6%" — and that distinction is exactly what the distractor cases test.
 */
export function itemToText(item: ItemForText): string {
  return [
    section('Project', item.title),
    section('Role', item.role ?? ''),
    section('What it involved', item.description),
    section('Outcome', item.outcome ?? ''),
    section('Built with', (item.techStack ?? []).join(', ')),
  ]
    .filter(Boolean)
    .join('\n');
}

export function talentToText(talent: TalentForText): string {
  const skills = talent.skills
    .map((s) => {
      // Years and proficiency qualify a claim. "Stripe (expert, 5 years)" is a different
      // statement from "Stripe", and the model can use the difference.
      const qualifiers = [s.proficiency, s.years ? `${s.years} years` : null]
        .filter(Boolean)
        .join(', ');
      return qualifiers ? `${s.name} (${qualifiers})` : s.name;
    })
    .join(', ');

  const context = [
    talent.yearsExperience ? `${talent.yearsExperience} years experience` : null,
    talent.availability ? `available ${talent.availability.replace(/_/g, ' ')}` : null,
    talent.timezone,
  ]
    .filter(Boolean)
    .join(', ');

  /**
   * Order is deliberate: headline, then what they have SHIPPED, then the bio, then the skill
   * tags. Evidence before claims — rule 2 above.
   */
  const parts = [
    section('Developer', talent.headline),
    talent.items.length > 0 ? `Shipped work:\n${talent.items.map(itemToText).join('\n\n')}` : null,
    section('About', talent.bio ?? ''),
    section('Skills', skills),
    section(
      'Certifications',
      (talent.certifications ?? []).map((c) => `${c.name} (${c.issuer})`).join(', '),
    ),
    section('Context', context),
  ].filter(Boolean);

  return truncate(parts.join('\n\n'));
}

export function jobToText(job: JobForText): string {
  // Required and nice-to-have are separated, not merged. A job that REQUIRES Stripe and would
  // LIKE React is not the same brief as one that wants both equally, and a merged list says
  // the latter.
  const required = job.skills.filter((s) => s.isRequired).map((s) => s.name);
  const optional = job.skills.filter((s) => !s.isRequired).map((s) => s.name);

  const context = [
    job.engagementType ? `${job.engagementType.replace(/_/g, ' ')} engagement` : null,
    job.locationType,
    job.experienceLevel ? `${job.experienceLevel} level` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const parts = [
    section('Role', job.title),
    section('The work', job.description),
    section('Responsibilities', job.responsibilities ?? ''),
    section('Requirements', job.requirements ?? ''),
    section('Must have', required.join(', ')),
    section('Nice to have', optional.join(', ')),
    section('Context', context),
  ].filter(Boolean);

  return truncate(parts.join('\n\n'));
}

/**
 * Truncate on a paragraph boundary, then a sentence, then a word — never mid-word.
 *
 * A hard character cut can sever "Stripe subscription billing" into "Stripe subscr", which
 * embeds as something else entirely. Losing a whole paragraph is honest; producing a fragment
 * that means something different is not.
 */
export function truncate(text: string, max = MAX_CHARS): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  for (const boundary of ['\n\n', '. ', ' ']) {
    const at = head.lastIndexOf(boundary);
    // Only accept a boundary that keeps most of the budget; otherwise try a finer one.
    if (at > max * 0.6) return head.slice(0, at).trim();
  }
  return head.trim();
}

/**
 * Whether there is enough here to embed usefully.
 *
 * Not a gate on publishing — ADR-008 removed every one of those. This decides whether to spend
 * an embedding call, and it lets the match feed say "your profile is too sparse to match well"
 * rather than returning confident nonsense generated from a headline.
 */
export function isEmbeddable(text: string): boolean {
  // A headline alone is roughly 40-60 characters. The threshold sits above that on purpose.
  return clean(text).length >= 120;
}
