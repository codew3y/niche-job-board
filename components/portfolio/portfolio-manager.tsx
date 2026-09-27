'use client';

import Image from 'next/image';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { ImageUpload } from '@/components/upload/image-upload';
import { attachMedia, detachMedia } from '@/lib/actions/media';
import { Field } from '@/components/ui/field';
import { ItemList } from './item-list';
import { saveItem } from '@/lib/actions/profile';
import type { ActionResult } from '@/lib/actions/auth';

type Media = { id: string; url: string; alt_text: string; sort_order: number };

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
  item_media?: Media[];
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

      {/*
        Images attach to a SAVED item, so this only appears when editing one. A new project
        has no id yet, and uploading against an id that does not exist would either orphan the
        object or need a draft row nobody asked for.
      */}
      {editing && <ItemMedia item={editing} />}

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
    <form action={action} className="space-y-4 rounded-md border border-border-strong p-5">
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
          className={`w-full rounded-md border bg-surface-raised p-3
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

function ItemMedia({ item }: { item: Item }) {
  const media = [...(item.item_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-3 rounded-md border border-border-base p-5">
      <div>
        <h3 className="font-medium">Images</h3>
        <p className="mt-0.5 text-sm text-text-muted text-pretty">
          Screenshots of the work. Every image needs a description — that is what someone using a
          screen reader gets instead of the picture.
        </p>
      </div>

      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="space-y-1.5">
              {/* Two columns on phones, three from sm — a thumbnail grid, so the widths are
                  small and the savings from resizing are correspondingly large. */}
              <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border-base">
                <Image
                  src={m.url}
                  alt={m.alt_text}
                  fill
                  sizes="(min-width: 640px) 33vw, 50vw"
                  className="object-cover"
                />
              </div>
              <form action={detachMedia}>
                <input type="hidden" name="mediaId" value={m.id} />
                <button
                  type="submit"
                  className="text-xs text-text-muted underline hover:text-danger"
                >
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <ImageUpload
        label="Add a screenshot"
        onUploaded={async ({ url, altText }) => {
          const data = new FormData();
          data.set('itemId', item.id);
          data.set('url', url);
          data.set('altText', altText);
          data.set('sortOrder', String(media.length));
          await attachMedia(data);
        }}
      />
    </div>
  );
}
