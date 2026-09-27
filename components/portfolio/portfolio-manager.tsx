'use client';

import { Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Field, FormError, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { ImageUpload } from '@/components/upload/image-upload';
import { attachMedia, detachMedia } from '@/lib/actions/media';
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
      {items.length > 0 ? (
        <ItemList
          items={items}
          onEdit={(id) => {
            setEditingId(id);
            setAdding(false);
          }}
        />
      ) : (
        !adding && (
          <div className="rounded-lg border border-dashed border-border-strong p-8 text-center">
            <p className="font-serif text-2xl">No projects yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-text-muted text-pretty">
              A project is what a client reads first — what it was, what you did, and what changed.
            </p>
          </div>
        )
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
        Images attach to a SAVED item, so this only appears when editing one. A new project has
        no id yet, and uploading against an id that does not exist would either orphan the object
        or need a draft row nobody asked for.
      */}
      {editing && <ItemMedia item={editing} />}

      {!adding && !editing && (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
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
    <form
      action={action}
      className="animate-rise space-y-5 rounded-lg border border-border-strong bg-surface-raised p-5 shadow-sm sm:p-6"
    >
      {item && <input type="hidden" name="itemId" value={item.id} />}

      <div className="flex items-center justify-between gap-4">
        <h3 className="font-serif text-2xl">{item ? 'Edit project' : 'New project'}</h3>
        <Button variant="ghost" size="icon-sm" onClick={onDone} aria-label="Close without saving">
          <X aria-hidden="true" />
        </Button>
      </div>

      <Field
        label="Title"
        name="title"
        required
        defaultValue={item?.title ?? ''}
        placeholder="Subscription checkout rebuild"
        errors={fields?.title}
      />
      <TextareaField
        label="What was it, and what did you do?"
        name="description"
        rows={3}
        defaultValue={item?.description ?? ''}
        errors={fields?.description}
      />
      <Field
        label="Outcome"
        name="outcome"
        optional
        defaultValue={item?.outcome ?? ''}
        placeholder="Failed payments fell from 4.1% to 0.6%"
        hint="A number if you have one — this is the most persuasive field on your profile."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Role"
          name="role"
          optional
          defaultValue={item?.role ?? ''}
          placeholder="Sole developer"
        />
        <Field
          label="Tech stack"
          name="techStack"
          optional
          defaultValue={item?.tech_stack.join(', ') ?? ''}
          placeholder="Next.js, Stripe, Postgres"
          hint="Comma separated."
        />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Repo"
          name="repoUrl"
          type="url"
          inputMode="url"
          optional
          defaultValue={item?.repo_url ?? ''}
          errors={fields?.repoUrl}
        />
        <Field
          label="Live URL"
          name="liveUrl"
          type="url"
          inputMode="url"
          optional
          defaultValue={item?.live_url ?? ''}
          errors={fields?.liveUrl}
        />
      </div>

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}

      <div className="flex gap-2 border-t border-border-base pt-5">
        <SubmitButton pendingLabel="Saving…">Save project</SubmitButton>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ItemMedia({ item }: { item: Item }) {
  const media = [...(item.item_media ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4 rounded-lg border border-border-base bg-surface-raised p-5 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Images</h3>
        <p className="mt-0.5 text-sm text-text-muted text-pretty">
          Screenshots of the work. Every image needs a description — that is what someone using a
          screen reader gets instead of the picture.
        </p>
      </div>

      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="group relative">
              {/* A thumbnail grid: two columns on phones, three from sm — small widths, so the
                  savings from resizing are correspondingly large. */}
              <div className="relative aspect-video w-full overflow-hidden rounded-md border border-border-base bg-surface-sunken">
                <Image
                  src={m.url}
                  alt={m.alt_text}
                  fill
                  sizes="(min-width: 640px) 200px, 45vw"
                  className="object-cover"
                />
              </div>
              <form action={detachMedia} className="mt-1.5">
                <input type="hidden" name="mediaId" value={m.id} />
                <SubmitButton
                  variant="danger-ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  pendingLabel="Removing…"
                >
                  Remove
                </SubmitButton>
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
