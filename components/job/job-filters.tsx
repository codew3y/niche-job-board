'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ENGAGEMENT_LABEL, LOCATION_LABEL } from '@/components/shared/money';
import { FilterSelect } from '@/components/shared/filter-select';
import { SearchBar } from '@/components/shared/search-bar';
import { SkillFilter } from '@/components/shared/skill-filter';
import type { SkillOption } from '@/lib/services/skills';

/**
 * Filters for the non-AI browse path (story M8).
 *
 * State lives in the URL, not in React. That makes a filtered list shareable, bookmarkable,
 * and survivable across a refresh — and it means the server component does the filtering,
 * so there is no client-side data fetch to keep in sync.
 *
 * On phones the filter pills are one horizontally scrollable strip rather than three wrapped
 * rows pushing the results below the fold. The strip is `overflow-x-auto` on purpose, which
 * e2e/responsive.spec.ts treats as the deliberate choice it is.
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
      <SearchBar
        id="job-search"
        label="Search jobs"
        value={q}
        onChange={setQ}
        onSubmit={() => set('q', q.trim())}
        onClear={() => {
          setQ('');
          set('q', '');
        }}
        placeholder="Search — try “Stripe”, “n8n”, “WooCommerce”"
        pending={isPending}
      />

      <div className="-mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
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
            className="pressable h-10 shrink-0 rounded-full px-4 text-sm font-medium text-text-muted hover:bg-surface-sunken hover:text-text"
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
    <FilterSelect id={`filter-${label}`} label={label} value={value} onChange={onChange}>
      <option value="">{label}: any</option>
      {Object.entries(options).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </FilterSelect>
  );
}
