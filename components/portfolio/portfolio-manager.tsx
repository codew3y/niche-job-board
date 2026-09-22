'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { ItemList } from './item-list';
import { saveItem } from '@/lib/actions/profile';
import type { ActionResult } from '@/lib/actions/auth';

type Item = {
  id: string;
  title: string;
  description: string;
  role: string | null;
  outcome: string | null;
  tech_stack: string[];
  repo_url: string | null;
  live_url: string | null;
  sort_order: number;
};

export function PortfolioManager({ items }: { items: Item[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const editing = items.find((i) => i.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      {items.length > 0 && (
        <ItemList
          items={items}
          onEdit={(id) => {
            setEditingId(id);
            setAdding(false);
          }}
        />
      )}

      {(adding || editing) && (
        <ItemForm
          key={editing?.id ?? 'new'}
          item={editing}
          onDone={() => {
            setAdding(false);
            setEditingId(null);
          }}
        />
      )}

      {!adding && !editing && (
        <Button type="button" variant="secondary" onClick={() => setAdding(true)}>
          Add a project
        </Button>
      )}
    </div>
  );
}

function ItemForm({ item, onDone }: { item: Item | null; onDone: () => void }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveItem, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    // Saved — close the form rather than leaving a stale one open.
    queueMicrotask(onDone);
  }

  return (
    <form action={action} className="space-y-4 rounded-[--radius] border border-border-strong p-5">
      {item && <input type="hidden" name="itemId" value={item.id} />}

      <h3 className="font-medium">{item ? 'Edit project' : 'New project'}</h3>

      <Field
        label="Title"
        name="title"
        required
        defaultValue={item?.title ?? ''}
        placeholder="Subscription checkout rebuild"
        errors={fields?.title}
      />

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium">
          What was it, and what did you do?
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={item?.description ?? ''}
          aria-invalid={Boolean(fields?.description)}
          className={`w-full rounded-[--radius] border bg-surface-raised p-3
            ${fields?.description ? 'border-danger' : 'border-border-strong'}`}
        />
        {fields?.description && <p className="text-sm text-danger">{fields.description[0]}</p>}
      </div>

      <Field
        label="Outcome"
        name="outcome"
        defaultValue={item?.outcome ?? ''}
        placeholder="Failed payments fell from 4.1% to 0.6%"
        hint="A number if you have one — this is the most persuasive field on your profile."
      />
      <Field
        label="Role"
        name="role"
        defaultValue={item?.role ?? ''}
        placeholder="Sole developer"
      />
      <Field
        label="Tech stack"
        name="techStack"
        defaultValue={item?.tech_stack.join(', ') ?? ''}
        placeholder="Next.js, Stripe, Postgres"
        hint="Comma separated."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Repo"
          name="repoUrl"
          type="url"
          defaultValue={item?.repo_url ?? ''}
          errors={fields?.repoUrl}
        />
        <Field
          label="Live URL"
          name="liveUrl"
          type="url"
          defaultValue={item?.live_url ?? ''}
          errors={fields?.liveUrl}
        />
      </div>

      {state?.ok === false && !state.fields && (
        <p role="alert" className="text-sm text-danger">
          {state.message}
        </p>
      )}

      <div className="flex gap-2">
        <SaveItem />
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SaveItem() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? 'Saving…' : 'Save project'}
    </Button>
  );
}
