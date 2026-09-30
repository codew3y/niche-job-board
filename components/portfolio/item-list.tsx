'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { ArrowDown, ArrowUp, GripVertical, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { SubmitButton } from '@/components/ui/submit-button';
import { cn } from '@/lib/ui/cn';
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
 * Reorderable project list: drag OR buttons, with the buttons as the primary mechanism.
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

  /**
   * FLIP on reorder (DESIGN.md §5). Pressing "Move up" used to teleport the item, and the eye
   * loses where it went — the textbook case for spatial-consistency motion. Before each reorder
   * the rows' positions are recorded; after React commits the new order, each row that moved is
   * played from its old position to its new one.
   *
   * WAAPI on `transform` only: composited, and interruptible — a second press mid-flight starts
   * from wherever the row currently is (`getBoundingClientRect` includes the running transform).
   * 220ms on the strong ease-in-out, because the row is already on screen and MOVING rather than
   * entering. Skipped entirely under reduced motion: the reorder is then instant, and the live
   * region still announces it.
   */
  const rows = useRef(new Map<string, HTMLLIElement>());
  const before = useRef<Map<string, DOMRect> | null>(null);
  const snapshot = () => {
    before.current = new Map(
      [...rows.current].map(([id, el]) => [id, el.getBoundingClientRect()] as const),
    );
  };
  useLayoutEffect(() => {
    const prev = before.current;
    before.current = null;
    if (!prev || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [id, el] of rows.current) {
      const was = prev.get(id);
      if (!was) continue;
      const dy = was.top - el.getBoundingClientRect().top;
      if (Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], {
        duration: 220,
        easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
      });
    }
  }, [order]);

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    snapshot();
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setAnnouncement(`${next[target]!.title} moved to position ${target + 1} of ${next.length}`);
  };

  /** Drag lands on the same reordering path as the buttons — one implementation, two inputs. */
  const dropAt = (to: number) => {
    if (dragIndex === null || dragIndex === to) return;
    snapshot();
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
            ref={(el) => {
              if (el) rows.current.set(item.id, el);
              else rows.current.delete(item.id);
            }}
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
            className={cn(
              'rounded-lg border bg-surface-raised p-4 shadow-xs transition-[border-color,background-color,opacity] duration-fast ease-out sm:p-5',
              dragIndex === i && 'opacity-50',
              overIndex === i && dragIndex !== i
                ? 'border-accent bg-accent-subtle'
                : 'border-border-base',
            )}
          >
            <div className="flex items-start gap-3">
              {/*
                A grab affordance for mouse users. aria-hidden and not focusable on purpose: it is
                decoration, and the two buttons beside it are what a keyboard or screen reader
                actually uses. Announcing a handle that cannot be operated by keyboard would be
                worse than not mentioning it.
              */}
              <span
                aria-hidden="true"
                title="Drag to reorder"
                className="mt-0.5 hidden cursor-grab text-text-subtle select-none active:cursor-grabbing sm:block"
              >
                <GripVertical size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-balance text-text">{item.title}</h3>
                <p className="mt-0.5 line-clamp-2 text-sm text-text-muted text-pretty">
                  {item.description}
                </p>
                {item.tech_stack.length > 0 && (
                  <p className="mt-1.5 text-sm text-text-subtle">{item.tech_stack.join(', ')}</p>
                )}
              </div>
              <div className="-mt-1 -mr-1 flex shrink-0 items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="max-sm:size-10"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move ${item.title} up`}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="max-sm:size-10"
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Move ${item.title} down`}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="mt-3 -mb-1 flex gap-1 border-t border-border-base pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="max-sm:h-10"
                onClick={() => onEdit(item.id)}
              >
                <Pencil aria-hidden="true" />
                Edit
              </Button>
              <form action={deleteItem}>
                <input type="hidden" name="itemId" value={item.id} />
                <SubmitButton
                  variant="danger-ghost"
                  size="sm"
                  className="max-sm:h-10"
                  pendingLabel="Deleting…"
                >
                  <Trash2 aria-hidden="true" />
                  Delete
                </SubmitButton>
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
        <form
          action={reorderItems}
          className="sticky bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] flex flex-wrap items-center gap-3 rounded-lg border border-border-base bg-surface-raised p-3 shadow-md sm:bottom-4"
        >
          {order.map((item) => (
            <input key={item.id} type="hidden" name="itemId" value={item.id} />
          ))}
          <span role="status" className="mr-auto text-sm font-medium text-text">
            Order changed. Save to keep it.
          </span>
          <Button variant="ghost" size="sm" className="max-sm:h-10" onClick={() => setOrder(items)}>
            Reset
          </Button>
          <SubmitButton size="sm" className="max-sm:h-10" pendingLabel="Saving…">
            Save order
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
