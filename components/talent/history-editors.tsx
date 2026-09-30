'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/lib/actions/auth';
import {
  deleteEducation,
  deleteExperience,
  saveEducation,
  saveExperience,
} from '@/lib/actions/profile';
import type { EducationRow, ExperienceRow } from '@/lib/services/talent';
import { formatMonth } from './history-format';

/**
 * Experience and education: repeatable entries with add / edit / remove. Both follow the same
 * shape (a list, and one open form at a time, new or editing), so they share `RowList`.
 *
 * The list is a ruled panel; the open form is a raised panel, because it is the thing being
 * worked on. Row buttons are 40px on a phone (`max-sm:size-10`), 36px on pointer screens.
 */

type Editing = string | 'new' | null;

export function ExperienceEditor({ rows }: { rows: ExperienceRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const current = rows.find((r) => r.id === editing) ?? null;

  return (
    <RowList
      empty="No roles yet. Add the work a client should know about."
      addLabel="Add a role"
      editing={editing}
      setEditing={setEditing}
      items={rows.map((r) => ({
        id: r.id,
        title: `${r.role} · ${r.company}`,
        meta: `${formatMonth(r.start_date)} - ${r.end_date ? formatMonth(r.end_date) : 'Present'}`,
      }))}
      remove={deleteExperience}
      form={
        editing !== null && (
          <ExperienceForm key={editing} row={current} onDone={() => setEditing(null)} />
        )
      }
    />
  );
}

export function EducationEditor({ rows }: { rows: EducationRow[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const current = rows.find((r) => r.id === editing) ?? null;

  return (
    <RowList
      empty="No education added yet."
      addLabel="Add education"
      editing={editing}
      setEditing={setEditing}
      items={rows.map((r) => ({
        id: r.id,
        title: r.degree ? `${r.degree} · ${r.school}` : r.school,
        meta: [r.start_year, r.end_year].filter(Boolean).join(' - '),
      }))}
      remove={deleteEducation}
      form={
        editing !== null && (
          <EducationForm key={editing} row={current} onDone={() => setEditing(null)} />
        )
      }
    />
  );
}

function RowList({
  items,
  empty,
  addLabel,
  editing,
  setEditing,
  remove,
  form,
}: {
  items: { id: string; title: string; meta: string }[];
  empty: string;
  addLabel: string;
  editing: Editing;
  setEditing: (v: Editing) => void;
  remove: (formData: FormData) => Promise<void>;
  form: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {items.length > 0 ? (
        <ul className="divide-y divide-border-base rounded-lg border border-border-base bg-surface-raised">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-3 pr-2 pl-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{item.title}</p>
                {item.meta && <p className="text-sm text-text-muted tabular-nums">{item.meta}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="max-sm:size-10"
                aria-label={`Edit ${item.title}`}
                onClick={() => setEditing(item.id)}
              >
                <Pencil aria-hidden="true" />
              </Button>
              <form action={remove}>
                <input type="hidden" name="id" value={item.id} />
                <SubmitButton
                  variant="danger-ghost"
                  size="icon-sm"
                  className="max-sm:size-10"
                  aria-label={`Remove ${item.title}`}
                  pendingLabel=""
                >
                  <Trash2 aria-hidden="true" />
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        editing === null && <p className="text-sm text-text-muted text-pretty">{empty}</p>
      )}

      {form}

      {editing === null && (
        <Button
          variant="secondary"
          size="sm"
          className="max-sm:h-10"
          onClick={() => setEditing('new')}
        >
          <Plus aria-hidden="true" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}

function useSaved(state: ActionResult | null, onDone: () => void) {
  // Close once saved, rather than leaving a stale form open.
  if (state?.ok) queueMicrotask(onDone);
}

function ExperienceForm({ row, onDone }: { row: ExperienceRow | null; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveExperience, null);
  const fields = state?.ok === false ? state.fields : undefined;
  useSaved(state, onDone);

  return (
    <form
      action={action}
      className="space-y-5 rounded-lg border border-border-base bg-surface-raised p-4 shadow-xs sm:p-5"
      noValidate
    >
      {row && <input type="hidden" name="id" value={row.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Role"
          name="role"
          required
          defaultValue={row?.role ?? ''}
          errors={fields?.role}
        />
        <Field
          label="Company"
          name="company"
          required
          defaultValue={row?.company ?? ''}
          errors={fields?.company}
        />
        <Field
          label="Start"
          name="startDate"
          type="month"
          required
          defaultValue={row?.start_date.slice(0, 7) ?? ''}
          errors={fields?.startDate}
        />
        <Field
          label="End"
          name="endDate"
          type="month"
          optional
          defaultValue={row?.end_date?.slice(0, 7) ?? ''}
          errors={fields?.endDate}
          hint="Leave empty if you still work here."
        />
      </div>
      <TextareaField
        label="Description"
        name="description"
        rows={3}
        optional
        defaultValue={row?.description ?? ''}
        errors={fields?.description}
      />
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <div className="flex gap-2">
        <SubmitButton size="sm" className="max-sm:h-10" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <Button variant="ghost" size="sm" className="max-sm:h-10" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function EducationForm({ row, onDone }: { row: EducationRow | null; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveEducation, null);
  const fields = state?.ok === false ? state.fields : undefined;
  useSaved(state, onDone);

  return (
    <form
      action={action}
      className="space-y-5 rounded-lg border border-border-base bg-surface-raised p-4 shadow-xs sm:p-5"
      noValidate
    >
      {row && <input type="hidden" name="id" value={row.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="School"
          name="school"
          required
          defaultValue={row?.school ?? ''}
          errors={fields?.school}
        />
        <Field
          label="Degree"
          name="degree"
          optional
          defaultValue={row?.degree ?? ''}
          errors={fields?.degree}
        />
        <Field
          label="From (year)"
          name="startYear"
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          optional
          defaultValue={row?.start_year ?? ''}
          errors={fields?.startYear}
        />
        <Field
          label="To (year)"
          name="endYear"
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          optional
          defaultValue={row?.end_year ?? ''}
          errors={fields?.endYear}
        />
      </div>
      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}
      <div className="flex gap-2">
        <SubmitButton size="sm" className="max-sm:h-10" pendingLabel="Saving…">
          Save
        </SubmitButton>
        <Button variant="ghost" size="sm" className="max-sm:h-10" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
