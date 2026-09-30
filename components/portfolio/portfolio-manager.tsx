'use client';

import { ChevronRight, FolderKanban, Plus, X } from 'lucide-react';
import Image from 'next/image';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, FormError, TextareaField } from '@/components/ui/field';
import { SubmitButton } from '@/components/ui/submit-button';
import { ImageUpload } from '@/components/upload/image-upload';
import { attachMedia, detachMedia } from '@/lib/actions/media';
import { ItemList } from './item-list';
import { LinkListInput } from './link-list-input';
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
  links: string[];
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
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            body="A project is what a client reads first: what it was, what you did, and what changed."
            action={
              <Button variant="secondary" onClick={() => setAdding(true)}>
                <Plus aria-hidden="true" />
                Add a project
              </Button>
            }
          />
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
          onCreated={(id) => {
            // A new project opens straight into edit mode, so its photos can be added now.
            setAdding(false);
            setEditingId(id);
          }}
        />
      )}

      {/*
        Images attach to a SAVED item, so this only appears when editing one. A new project has
        no id yet, and uploading against an id that does not exist would either orphan the object
        or need a draft row nobody asked for.
      */}
      {editing && <ItemMedia item={editing} />}

      {/* With no projects, the empty state above carries this same button. */}
      {!adding && !editing && items.length > 0 && (
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus aria-hidden="true" />
          Add a project
        </Button>
      )}
    </div>
  );
}

function ItemForm({
  item,
  onDone,
  onCreated,
}: {
  item: Item | null;
  onDone: () => void;
  onCreated: (id: string) => void;
}) {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveItem, null);
  const fields = state?.ok === false ? state.fields : undefined;

  if (state?.ok) {
    // Saved. A brand-new project moves on to its photos; an edit closes the form rather than
    // leaving a stale one open.
    const createdId = !item && state.id ? state.id : null;
    queueMicrotask(() => (createdId ? onCreated(createdId) : onDone()));
  }

  return (
    <form
      action={action}
      className="space-y-5 rounded-lg border border-border-base bg-surface-raised p-4 shadow-sm sm:p-6"
    >
      {item && <input type="hidden" name="itemId" value={item.id} />}

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold tracking-tight">
          {item ? 'Edit project' : 'New project'}
        </h3>
        <Button
          variant="ghost"
          size="icon-sm"
          className="-mr-1 max-sm:size-10"
          onClick={onDone}
          aria-label="Close without saving"
        >
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
        label="Short description"
        name="description"
        rows={3}
        defaultValue={item?.description ?? ''}
        errors={fields?.description}
        hint="What it was and what you did. At least 40 characters."
      />

      <LinkListInput initial={item?.links ?? []} errors={fields?.links} />

      {/* Optional extras. Kept because matching reads them (lib/matching/text.ts), folded away
          because the four fields above are the project. */}
      <details className="group rounded-md border border-border-base bg-surface px-4 py-3">
        <summary className="flex min-h-6 cursor-pointer items-center gap-1.5 text-sm font-semibold text-text select-none">
          <ChevronRight
            aria-hidden="true"
            size={16}
            className="shrink-0 text-text-subtle transition-transform duration-fast ease-out group-open:rotate-90 motion-reduce:transition-none"
          />
          More detail <span className="font-normal text-text-subtle">(helps matching)</span>
        </summary>
        <div className="mt-4 space-y-5">
          <Field
            label="Outcome"
            name="outcome"
            optional
            defaultValue={item?.outcome ?? ''}
            placeholder="Failed payments fell from 4.1% to 0.6%"
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
        </div>
      </details>

      {!item && (
        <p className="text-sm text-text-subtle">You can add photos once the project is saved.</p>
      )}

      {state?.ok === false && !state.fields && <FormError>{state.message}</FormError>}

      <div className="flex flex-wrap gap-2 border-t border-border-base pt-5">
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
    <div className="space-y-4 rounded-lg border border-border-base bg-surface-raised p-4 sm:p-6">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">Photos</h3>
        <p className="mt-0.5 text-sm text-text-muted text-pretty">
          Screenshots of the work. Every photo needs a short description, because that is what
          someone using a screen reader gets instead of the picture.
        </p>
      </div>

      {media.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <li key={m.id} className="group relative">
              {/* A thumbnail grid: two columns on phones, three from sm — small widths, so the
                  savings from resizing are correspondingly large. */}
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border-base bg-surface-sunken">
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
                  className="-ml-2 max-sm:h-10"
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
        label="Add a photo"
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
