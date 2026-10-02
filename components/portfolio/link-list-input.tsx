'use client';

import { Plus, X } from '@phosphor-icons/react/ssr';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';
import { controlStyles } from '@/components/ui/field';
import { cn } from '@/lib/ui/cn';

const MAX = 10;

/**
 * One or more links for a project: repo, live site, write-up. Each row posts as `link`, so the
 * server reads them with `formData.getAll('link')`. Blank rows are ignored on save.
 *
 * Rows get stable keys (not indexes), so removing the second of three does not shift the typed
 * text of the third into the second's input.
 */
export function LinkListInput({ initial = [], errors }: { initial?: string[]; errors?: string[] }) {
  const uid = useId();
  const [rows, setRows] = useState(() =>
    (initial.length ? initial : ['']).map((value, i) => ({ key: `${uid}-${i}`, value })),
  );
  const [counter, setCounter] = useState(rows.length);

  const add = () => {
    if (rows.length >= MAX) return;
    setRows((r) => [...r, { key: `${uid}-${counter}`, value: '' }]);
    setCounter((c) => c + 1);
  };

  return (
    <fieldset className="space-y-2" aria-describedby={errors?.length ? `${uid}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-semibold text-text">
        Links <span className="ml-1 font-normal text-text-subtle">Optional</span>
      </legend>

      {rows.map((row, i) => (
        <div key={row.key} className="flex gap-2">
          <label htmlFor={row.key} className="sr-only">
            Link {i + 1}
          </label>
          <input
            id={row.key}
            name="link"
            type="url"
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            value={row.value}
            onChange={(e) =>
              setRows((r) =>
                r.map((x) => (x.key === row.key ? { ...x, value: e.target.value } : x)),
              )
            }
            placeholder="https://github.com/you/project"
            aria-invalid={Boolean(errors?.length)}
            className={cn(
              controlStyles,
              'h-11 px-3.5',
              errors?.length ? 'border-danger' : 'border-control hover:border-text-subtle',
            )}
          />
          {rows.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove link ${i + 1}`}
              onClick={() => setRows((r) => r.filter((x) => x.key !== row.key))}
            >
              <X aria-hidden="true" />
            </Button>
          )}
        </div>
      ))}

      {errors?.length ? (
        <p id={`${uid}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : null}

      {rows.length < MAX && (
        <Button variant="ghost" size="sm" className="max-sm:h-10" onClick={add}>
          <Plus aria-hidden="true" />
          Add another link
        </Button>
      )}
    </fieldset>
  );
}
