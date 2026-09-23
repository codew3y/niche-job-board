'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { deleteItem, reorderItems } from '@/lib/actions/profile';

type Item = {
  id: string;
  title: string;
  description: string;
  outcome: string | null;
  tech_stack: string[];
  sort_order: number;
};

/**
 * Reorderable project list — drag OR buttons, with the buttons as the primary mechanism.
 *
 * The plan flags drag-reorder as the component most likely to skip its keyboard alternative
 * (§9, docs/components.md), so this was built keyboard-first and drag was added afterwards.
 * That order matters: the move-up/move-down buttons are not a fallback bolted on for
 * compliance, they are the path that always works, and dragging is the enhancement.
 *
 * Both drive the same `move()`, so there is one reordering code path and no way for the two
 * to disagree.
 *
 * Native HTML5 drag events rather than a library: this is a short vertical list, the whole
 * interaction is dragstart/dragover/drop, and a drag-and-drop dependency would be more code
 * shipped to the browser than the feature itself.
 *
 * Order is submitted as the full sequence rather than a move instruction, because a move is
 * only meaningful against a list the server also has, and a second open tab makes them
 * disagree.
 */
export function ItemList({ items, onEdit }: { items: Item[]; onEdit: (id: string) => void }) {
  const [order, setOrder] = useState(items);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  /** Announced to screen readers after a move, since a visual reshuffle says nothing. */
  const [announcement, setAnnouncement] = useState('');

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setAnnouncement(`${next[target]!.title} moved to position ${target + 1} of ${next.length}`);
  };

  /** Drag lands on the same reordering path as the buttons — one implementation, two inputs. */
  const dropAt = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    const next = [...order];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(to, 0, moved!);
    setOrder(next);
    setAnnouncement(`${moved!.title} moved to position ${to + 1} of ${next.length}`);
    setDragIndex(null);
    setOverIndex(null);
  };

  const dirty = order.some((item, i) => item.id !== items[i]?.id);

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {order.map((item, i) => (
          <li
            key={item.id}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = 'move';
              // Firefox ignores a drag that carries no data.
              e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverIndex(i);
            }}
            onDragLeave={() => setOverIndex((v) => (v === i ? null : v))}
            onDrop={(e) => {
              e.preventDefault();
              dropAt(i);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            className={`rounded-[--radius] border bg-surface-raised p-4 transition-colors duration-[--duration-fast]
              ${dragIndex === i ? 'opacity-50' : ''}
              ${overIndex === i && dragIndex !== i ? 'border-accent bg-accent-subtle' : 'border-border-base'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-muted">{item.description}</p>
                {item.tech_stack.length > 0 && (
                  <p className="mt-1.5 font-mono text-xs text-text-subtle">
                    {item.tech_stack.join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {/*
                  A grab affordance for mouse users. aria-hidden and not focusable on purpose:
                  it is decoration, and the two buttons beside it are what a keyboard or screen
                  reader actually uses. Announcing a handle that cannot be operated by keyboard
                  would be worse than not mentioning it.
                */}
                <span
                  aria-hidden="true"
                  className="cursor-grab select-none px-1 text-text-subtle active:cursor-grabbing"
                  title="Drag to reorder"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${item.title} up`}
                  className="grid h-8 w-8 place-items-center rounded-[--radius-sm] transition-colors duration-[--duration-fast] hover:bg-surface-sunken disabled:opacity-30"
                >
                  <span aria-hidden="true">↑</span>
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${item.title} down`}
                  className="grid h-8 w-8 place-items-center rounded-[--radius-sm] transition-colors duration-[--duration-fast] hover:bg-surface-sunken disabled:opacity-30"
                >
                  <span aria-hidden="true">↓</span>
                </button>
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(item.id)}>
                Edit
              </Button>
              <form action={deleteItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <Button type="submit" variant="ghost" size="sm" className="text-danger">
                  Delete
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>

      {/* Every move is announced. A list that silently reshuffles tells a screen-reader user
          nothing about what their keypress did. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {dirty && (
        <form action={reorderItems} className="flex items-center gap-3">
          {order.map((item) => (
            <input key={item.id} type="hidden" name="itemId" value={item.id} />
          ))}
          <Button type="submit" size="sm">
            Save order
          </Button>
          <button
            type="button"
            onClick={() => setOrder(items)}
            className="text-sm text-text-muted hover:text-text"
          >
            Reset
          </button>
          <span role="status" className="text-sm text-text-subtle">
            Order changed
          </span>
        </form>
      )}
    </div>
  );
}
