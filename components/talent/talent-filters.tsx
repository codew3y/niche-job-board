'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { FilterSelect } from '@/components/shared/filter-select';
import { SearchBar } from '@/components/shared/search-bar';
import { SkillFilter } from '@/components/shared/skill-filter';
import type { SkillOption } from '@/lib/services/skills';

/**
 * Filters for developer browse — the counterpart to JobFilters, and deliberately the same: URL
 * as state, a clear-filters affordance, a live region.
 *
 * Rate is a single "up to" rather than a min/max pair. A client browsing has a ceiling, not a
 * floor — nobody filters for developers who charge at least £80.
 */
export function TalentFilters({ skills }: { skills: [string, SkillOption[]][] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const apply = (next: URLSearchParams) => {
    next.delete('cursor');
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    apply(next);
  };

  const hasFilters = ['q', 'skills', 'availability', 'rateMax'].some((k) => params.get(k));

  return (
    <search className="space-y-3">
      <SearchBar
        id="talent-search"
        label="Search developers"
        value={q}
        onChange={setQ}
        onSubmit={() => set('q', q.trim())}
        onClear={() => {
          setQ('');
          set('q', '');
        }}
        // Advertises the syntax the search actually supports now that it is full-text.
        placeholder="Search — try “Stripe integration”, or “react -native”"
        pending={isPending}
      />

      <div className="-mx-(--gutter) flex gap-2 overflow-x-auto px-(--gutter) pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        <SkillFilter
          skills={skills}
          value={params.get('skills') ?? ''}
          onChange={(v) => set('skills', v)}
        />
        <FilterSelect
          id="filter-availability"
          label="Availability"
          value={params.get('availability') ?? ''}
          onChange={(v) => set('availability', v)}
        >
          <option value="">Availability: any</option>
          <option value="full_time">Full time</option>
          <option value="part_time">Part time</option>
          <option value="occasional">Occasional</option>
        </FilterSelect>
        <FilterSelect
          id="filter-rate"
          label="Maximum hourly rate"
          value={params.get('rateMax') ?? ''}
          onChange={(v) => set('rateMax', v)}
        >
          <option value="">Rate: any</option>
          <option value="40">Up to 40/hr</option>
          <option value="75">Up to 75/hr</option>
          <option value="120">Up to 120/hr</option>
          <option value="200">Up to 200/hr</option>
        </FilterSelect>
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

      <p aria-live="polite" className="sr-only">
        {isPending ? 'Updating results' : 'Results updated'}
      </p>
    </search>
  );
}
