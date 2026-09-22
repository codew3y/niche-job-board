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
 * Reorderable project list.
 *
 * Move-up/move-down BUTTONS, not drag-and-drop. The plan flags drag-reorder as the component
 * most likely to skip its keyboard alternative (§9, docs/components.md) — so rather than
 * build drag first and retrofit keys, this is keyboard-native from the start and works
 * identically with a mouse, a keyboard or a screen reader.
 *
 * Order is submitted as the full sequence rather than a move instruction, because a move is
 * only meaningful against a list the server also has, and a second open tab makes them
 * disagree.
 */
export function ItemList({ items, onEdit }: { items: Item[]; onEdit: (id: string) => void }) {
  const [order, setOrder] = useState(items);

  const move = (index: number, delta: number) => {
    const next = [...order];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
  };

  const dirty = order.some((item, i) => item.id !== items[i]?.id);

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {order.map((item, i) => (
          <li
            key={item.id}
            className="rounded-[--radius] border border-border-base bg-surface-raised p-4"
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
              <div className="flex shrink-0 gap-1">
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
