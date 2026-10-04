'use client';

import { FileArrowUp, Info } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { useActionState, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button, buttonStyles } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  applyResume,
  readResume,
  type ApplyResult,
  type ReadResumeResult,
} from '@/lib/actions/resume-import';
import type { ResumeDraft } from '@/lib/import/resume-schema';
import { cn } from '@/lib/ui/cn';
import { formatMonth } from './history-format';

type Current = {
  headline: string;
  bio: string;
  website: string;
  skillIds: string[];
};

/**
 * Resume import: upload, then review, then add.
 *
 * Two steps on one page. The upload step says plainly what happens to the file before it is sent
 * (the consent box is required). The review step shows everything that was found, with a checkbox
 * per item; nothing is written until "Add to my profile". Defaults are conservative:
 *   - headline, bio and website are pre-ticked only when the profile field is empty, so an import
 *     never silently replaces something the person wrote;
 *   - an item missing what the profile requires (a role with no start date, a project with a
 *     one-line description) is shown, unticked and disabled, with the reason, rather than dropped
 *     or guessed at.
 * "Start over" re-mounts the upload step (`attempt`), discarding the draft.
 */
export function ResumeImport({ current, returnTo }: { current: Current; returnTo: string }) {
  const [attempt, setAttempt] = useState(0);
  return (
    <Upload
      key={attempt}
      current={current}
      returnTo={returnTo}
      onStartOver={() => setAttempt((n) => n + 1)}
    />
  );
}

function Upload({
  current,
  returnTo,
  onStartOver,
}: {
  current: Current;
  returnTo: string;
  onStartOver: () => void;
}) {
  const [state, action] = useActionState<ReadResumeResult | null, FormData>(readResume, null);

  if (state?.ok) {
    return (
      <Review
        draft={state.draft}
        skills={state.skills}
        current={current}
        returnTo={returnTo}
        onStartOver={onStartOver}
      />
    );
  }

  return (
    <form action={action} className="max-w-2xl space-y-6">
      <div className="rounded-lg border border-border-base bg-surface-raised p-5 sm:p-6">
        <label htmlFor="resume" className="block font-semibold">
          Your resume (PDF)
        </label>
        <p className="mt-1 text-sm text-text-muted text-pretty">
          A LinkedIn profile saved as PDF works too: on LinkedIn, open your profile, then More →
          Save to PDF. Up to 3 MB.
        </p>
        <input
          id="resume"
          name="resume"
          type="file"
          accept="application/pdf,.pdf"
          required
          className="mt-4 block w-full text-sm text-text-muted file:mr-4 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-control file:bg-surface-raised file:px-4 file:font-semibold file:text-text hover:file:bg-surface-sunken"
        />
      </div>

      <div className="flex gap-3 rounded-lg bg-info-subtle p-4 text-sm text-text">
        <Info aria-hidden="true" size={18} className="mt-0.5 shrink-0 text-info" />
        <div className="space-y-2 text-pretty">
          <p className="font-semibold">What happens to your resume</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>We read the text in it. The file itself is never stored.</li>
            <li>Email addresses and phone numbers are removed before anything else happens.</li>
            <li>
              The remaining text is sent to Google&rsquo;s Gemini to sort it into profile sections.
              Google may use that text to improve its products (see the{' '}
              <Link href="/privacy" className="prose-link">
                privacy policy
              </Link>
              ).
            </li>
            <li>Nothing is added to your profile until you choose what to keep.</li>
          </ul>
        </div>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-5 shrink-0 accent-primary"
        />
        <span className="text-pretty">
          I understand how my resume is read, and that its text is sent to Google&rsquo;s Gemini.
        </span>
      </label>

      {state?.ok === false && <FormError>{state.message}</FormError>}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Reading your resume…">
          <FileArrowUp aria-hidden="true" />
          Read my resume
        </SubmitButton>
        <Link href={returnTo} className={buttonStyles({ variant: 'ghost' })}>
          Cancel
        </Link>
      </div>
      <p className="text-sm text-text-subtle">Reading takes up to half a minute.</p>
    </form>
  );
}

// ─────────────────────────── review ───────────────────────────

type Experience = ResumeDraft['experience'][number];
type Education = ResumeDraft['education'][number];
type Project = ResumeDraft['projects'][number];
type Certification = ResumeDraft['certifications'][number];

/** Why an item cannot be added as it stands, or null. Mirrors the server's rules. */
const problem = {
  experience: (e: Experience) =>
    e.role.length < 2 || !e.company
      ? 'Missing the role or company.'
      : !e.start
        ? 'No start date in your resume. Add this role by hand on your profile.'
        : null,
  education: (e: Education) => (e.school.length < 2 ? 'Missing the school name.' : null),
  project: (p: Project) =>
    p.title.length < 3
      ? 'Missing a title.'
      : p.description.length < 40
        ? 'The description is too short (40 characters needed). Add it by hand on your profile.'
        : null,
  certification: (c: Certification) =>
    !c.issuer
      ? 'Missing who issued it.'
      : !c.issued
        ? 'No issue date in your resume. Add it by hand on your profile.'
        : null,
};

const range = (start: string, end: string, current?: boolean) =>
  [
    start ? formatMonth(`${start}-01`) : '',
    current ? 'Present' : end ? formatMonth(`${end}-01`) : '',
  ]
    .filter(Boolean)
    .join(' - ');

function Review({
  draft,
  skills,
  current,
  returnTo,
  onStartOver,
}: {
  draft: ResumeDraft;
  skills: { matched: { id: string; name: string; from: string }[]; unmatched: string[] };
  current: Current;
  returnTo: string;
  onStartOver: () => void;
}) {
  const [applyState, applyAction] = useActionState<ApplyResult, FormData>(applyResume, null);

  // Editable text, ticked by default only when the profile field is empty.
  const [headline, setHeadline] = useState(draft.headline);
  const [useHeadline, setUseHeadline] = useState(Boolean(draft.headline) && !current.headline);
  const [bio, setBio] = useState(draft.summary);
  const [useBio, setUseBio] = useState(Boolean(draft.summary) && !current.bio);
  const [useWebsite, setUseWebsite] = useState(Boolean(draft.website) && !current.website);

  const have = new Set(current.skillIds);
  const newSkills = skills.matched.filter((s) => !have.has(s.id));
  const [skillOn, setSkillOn] = useState(() => new Set(newSkills.map((s) => s.id)));

  // One "on" set per list, keyed by index; invalid items can never be on.
  const initial = <T,>(rows: T[], check: (r: T) => string | null) =>
    new Set(rows.flatMap((r, i) => (check(r) ? [] : [i])));
  const [expOn, setExpOn] = useState(() => initial(draft.experience, problem.experience));
  const [eduOn, setEduOn] = useState(() => initial(draft.education, problem.education));
  const [projOn, setProjOn] = useState(() => initial(draft.projects, problem.project));
  const [certOn, setCertOn] = useState(() => initial(draft.certifications, problem.certification));

  const toggle = (set: Set<number>, update: (s: Set<number>) => void, i: number) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    update(next);
  };

  const selection = {
    ...(useHeadline ? { headline } : {}),
    ...(useBio ? { bio } : {}),
    ...(useWebsite ? { website: draft.website } : {}),
    skillIds: [...skillOn],
    experience: draft.experience.filter((_, i) => expOn.has(i)),
    education: draft.education.filter((_, i) => eduOn.has(i)),
    projects: draft.projects.filter((_, i) => projOn.has(i)),
    certifications: draft.certifications.filter((_, i) => certOn.has(i)),
  };
  const count =
    (useHeadline ? 1 : 0) +
    (useBio ? 1 : 0) +
    (useWebsite ? 1 : 0) +
    skillOn.size +
    expOn.size +
    eduOn.size +
    projOn.size +
    certOn.size;
  const foundAnything =
    draft.headline ||
    draft.summary ||
    draft.website ||
    skills.matched.length ||
    draft.experience.length ||
    draft.education.length ||
    draft.projects.length ||
    draft.certifications.length;

  if (!foundAnything) {
    return (
      <div className="max-w-2xl space-y-4 rounded-lg border border-border-base bg-surface-raised p-6">
        <p className="font-display text-xl font-semibold">Nothing to import from that file</p>
        <p className="text-sm text-text-muted text-pretty">
          We could not find profile details in it. Try another export of your resume, or fill your
          profile in by hand.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button onClick={onStartOver}>Try another file</Button>
          <Link href={returnTo} className={buttonStyles({ variant: 'ghost' })}>
            Back to your profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={applyAction} className="max-w-3xl space-y-8">
      <input type="hidden" name="selection" value={JSON.stringify(selection)} />
      <input type="hidden" name="returnTo" value={returnTo} />

      <p className="text-text-muted text-pretty">
        This is what we found. Tick what you want on your profile. Anything already there stays as
        it is, and you can edit everything after it is added.
      </p>

      {(draft.headline || draft.summary || draft.website) && (
        <Group title="Details">
          {draft.headline && (
            <Choice
              checked={useHeadline}
              onChange={setUseHeadline}
              label="Headline"
              note={current.headline ? `Replaces: "${current.headline}"` : undefined}
            >
              <input
                aria-label="Imported headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                maxLength={120}
                className="mt-2 h-11 w-full rounded-md border border-control bg-surface-raised px-3.5 text-text"
              />
            </Choice>
          )}
          {draft.summary && (
            <Choice
              checked={useBio}
              onChange={setUseBio}
              label="About your work"
              note={current.bio ? 'Replaces what is there now.' : undefined}
            >
              <textarea
                aria-label="Imported summary"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                maxLength={4000}
                className="mt-2 w-full rounded-md border border-control bg-surface-raised px-3.5 py-3 leading-relaxed text-text"
              />
            </Choice>
          )}
          {draft.website && (
            <Choice
              checked={useWebsite}
              onChange={setUseWebsite}
              label="Portfolio site"
              note={current.website ? `Replaces: ${current.website}` : undefined}
            >
              <p className="mt-1 text-sm break-all text-text-muted">{draft.website}</p>
            </Choice>
          )}
        </Group>
      )}

      {(skills.matched.length > 0 || skills.unmatched.length > 0) && (
        <Group title="Skills">
          {newSkills.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Skills found">
              {newSkills.map((s) => {
                const on = skillOn.has(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={cn(
                        'inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-sm border px-3 text-sm select-none',
                        on
                          ? 'border-primary bg-primary-subtle text-text'
                          : 'border-control text-text-muted',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => {
                          const next = new Set(skillOn);
                          if (on) next.delete(s.id);
                          else next.add(s.id);
                          setSkillOn(next);
                        }}
                        className="size-4 accent-primary"
                      />
                      {s.name}
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">
              Every skill we recognised is already on your profile.
            </p>
          )}
          {skills.unmatched.length > 0 && (
            <p className="mt-3 text-sm text-text-subtle text-pretty">
              Not in our skill list, so not added: {skills.unmatched.slice(0, 20).join(', ')}
              {skills.unmatched.length > 20 ? ` and ${skills.unmatched.length - 20} more` : ''}.
            </p>
          )}
          <p className="mt-2 text-sm text-text-subtle">A profile holds up to 30 skills.</p>
        </Group>
      )}

      <ItemGroup
        title="Experience"
        rows={draft.experience}
        on={expOn}
        onToggle={(i) => toggle(expOn, setExpOn, i)}
        check={problem.experience}
        render={(e) => ({
          title: `${e.role} · ${e.company}`,
          meta: range(e.start, e.end, e.current),
        })}
      />
      <ItemGroup
        title="Projects"
        rows={draft.projects}
        on={projOn}
        onToggle={(i) => toggle(projOn, setProjOn, i)}
        check={problem.project}
        render={(p) => ({
          title: p.title,
          meta: p.techStack.join(', '),
          body: p.description,
        })}
      />
      <ItemGroup
        title="Certifications"
        rows={draft.certifications}
        on={certOn}
        onToggle={(i) => toggle(certOn, setCertOn, i)}
        check={problem.certification}
        render={(c) => ({
          title: c.issuer ? `${c.name} · ${c.issuer}` : c.name,
          meta: range(c.issued, c.expires),
        })}
      />
      <ItemGroup
        title="Education"
        rows={draft.education}
        on={eduOn}
        onToggle={(i) => toggle(eduOn, setEduOn, i)}
        check={problem.education}
        render={(e) => ({
          title: e.degree ? `${e.degree} · ${e.school}` : e.school,
          meta: [e.startYear, e.endYear].filter(Boolean).join(' - '),
        })}
      />

      {applyState?.ok === false && <FormError>{applyState.message}</FormError>}

      {/* Clears the phone tab bar (--tabbar-space), like the job form's action bar. */}
      <div className="sticky bottom-[calc(var(--tabbar-space)+0.75rem)] z-sticky flex flex-wrap items-center gap-3 rounded-lg border border-border-base bg-surface-raised p-3 shadow-md md:bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]">
        <SubmitButton pendingLabel="Adding…" disabled={count === 0}>
          {count === 0
            ? 'Nothing selected'
            : `Add ${count} ${count === 1 ? 'item' : 'items'} to my profile`}
        </SubmitButton>
        <Button variant="ghost" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </form>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Choice({
  checked,
  onChange,
  label,
  note,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border-base bg-surface-raised p-4">
      <label className="flex items-center gap-3 font-semibold">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-5 accent-primary"
        />
        {label}
      </label>
      {note && <p className="mt-1 ml-8 text-sm text-warning">{note}</p>}
      <div className="ml-8">{children}</div>
    </div>
  );
}

function ItemGroup<T>({
  title,
  rows,
  on,
  onToggle,
  check,
  render,
}: {
  title: string;
  rows: T[];
  on: Set<number>;
  onToggle: (i: number) => void;
  check: (row: T) => string | null;
  render: (row: T) => { title: string; meta?: string; body?: string };
}) {
  if (rows.length === 0) return null;
  return (
    <Group title={title}>
      <ul className="divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
        {rows.map((row, i) => {
          const reason = check(row);
          const view = render(row);
          return (
            <li key={i} className="p-4">
              <label
                className={cn(
                  'flex items-start gap-3',
                  reason ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
              >
                <input
                  type="checkbox"
                  checked={on.has(i)}
                  disabled={Boolean(reason)}
                  onChange={() => onToggle(i)}
                  className="mt-0.5 size-5 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block font-semibold break-words',
                      reason ? 'text-text-muted' : 'text-text',
                    )}
                  >
                    {view.title}
                  </span>
                  {view.meta && (
                    <span className="block text-sm text-text-muted tabular-nums">{view.meta}</span>
                  )}
                  {view.body && (
                    <span className="mt-1 line-clamp-3 block text-sm text-text-muted">
                      {view.body}
                    </span>
                  )}
                  {reason && (
                    <span className="mt-1 flex items-center gap-2 text-sm text-warning">
                      <Badge tone="warning">Not added</Badge>
                      {reason}
                    </span>
                  )}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Group>
  );
}
