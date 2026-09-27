'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ENGAGEMENT_LABEL, LOCATION_LABEL } from '@/components/shared/money';
import { SkillFilter } from '@/components/shared/skill-filter';
import type { SkillOption } from '@/lib/services/skills';

/**
 * Filters for the non-AI browse path (story M8).
 *
 * State lives in the URL, not in React. That makes a filtered list shareable, bookmarkable,
 * and survivable across a refresh — and it means the server component does the filtering,
 * so there is no client-side data fetch to keep in sync.
 */
export function JobFilters({ skills }: { skills: [string, SkillOption[]][] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const apply = (next: URLSearchParams) => {
    next.delete('cursor'); // a filter change invalidates the page position
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  };

  const hasFilters = ['q', 'skills', 'engagement', 'locationType', 'experience', 'sort'].some((k) =>
    params.get(k),
  );

  return (
    <search className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const next = new URLSearchParams(params.toString());
          if (q.trim()) next.set('q', q.trim());
          else next.delete('q');
          apply(next);
        }}
        role="search"
      >
        <label htmlFor="job-search" className="sr-only">
          Search jobs
        </label>
        <input
          id="job-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search — try “Stripe”, “n8n”, “WooCommerce”"
          className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 placeholder:text-text-subtle"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        <SkillFilter
          skills={skills}
          value={params.get('skills') ?? ''}
          onChange={(v) => set('skills', v)}
        />
        <Select
          label="Engagement"
          value={params.get('engagement') ?? ''}
          options={ENGAGEMENT_LABEL}
          onChange={(v) => set('engagement', v)}
        />
        <Select
          label="Location"
          value={params.get('locationType') ?? ''}
          options={LOCATION_LABEL}
          onChange={(v) => set('locationType', v)}
        />
        <Select
          label="Experience"
          value={params.get('experience') ?? ''}
          options={{ junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead' }}
          onChange={(v) => set('experience', v)}
        />
        <Select
          label="Sort"
          value={params.get('sort') ?? ''}
          options={{
            recent: 'Newest first',
            budget_high: 'Highest budget',
            budget_low: 'Lowest budget',
          }}
          onChange={(v) => set('sort', v)}
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              startTransition(() => router.push(pathname));
            }}
            className="h-9 rounded-sm px-3 text-sm text-text-muted transition-colors duration-fast hover:bg-surface-sunken hover:text-text"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* aria-live so the result of a filter change is announced, not just seen. */}
      <p aria-live="polite" className="sr-only">
        {isPending ? 'Updating results' : 'Results updated'}
      </p>
    </search>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <span className="inline-flex items-center">
      <label className="sr-only" htmlFor={`filter-${label}`}>
        {label}
      </label>
      <select
        id={`filter-${label}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 rounded-sm border px-2.5 text-sm transition-colors duration-fast
          ${value ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface-raised'}`}
      >
        <option value="">{label}: any</option>
        {Object.entries(options).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </span>
  );
}
