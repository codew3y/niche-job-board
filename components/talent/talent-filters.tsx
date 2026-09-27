'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { SkillFilter } from '@/components/shared/skill-filter';
import type { SkillOption } from '@/lib/services/skills';

/**
 * Filters for developer browse.
 *
 * Talent browse shipped with no filter UI at all — the parameters existed in
 * `talentSearchParams` and could only be reached by editing the query string. This is the
 * counterpart to JobFilters and deliberately mirrors it: same URL-as-state approach, same
 * clear-filters affordance, same live region.
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
        <label htmlFor="talent-search" className="sr-only">
          Search developers
        </label>
        <input
          id="talent-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // The placeholder advertises the syntax the search actually supports now that it is
          // full-text rather than a substring match.
          placeholder="Search — try “Stripe integration”, or “react -native”"
          className="h-11 w-full rounded-md border border-border-strong bg-surface-raised px-3 placeholder:text-text-subtle"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        <SkillFilter
          skills={skills}
          value={params.get('skills') ?? ''}
          onChange={(v) => set('skills', v)}
        />

        <span className="inline-flex items-center">
          <label className="sr-only" htmlFor="filter-availability">
            Availability
          </label>
          <select
            id="filter-availability"
            value={params.get('availability') ?? ''}
            onChange={(e) => set('availability', e.target.value)}
            className={`h-9 rounded-sm border px-2.5 text-sm transition-colors duration-fast
              ${params.get('availability') ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface-raised'}`}
          >
            <option value="">Availability: any</option>
            <option value="full_time">Full time</option>
            <option value="part_time">Part time</option>
            <option value="occasional">Occasional</option>
          </select>
        </span>

        <span className="inline-flex items-center">
          <label className="sr-only" htmlFor="filter-rate">
            Maximum hourly rate
          </label>
          <select
            id="filter-rate"
            value={params.get('rateMax') ?? ''}
            onChange={(e) => set('rateMax', e.target.value)}
            className={`h-9 rounded-sm border px-2.5 text-sm transition-colors duration-fast
              ${params.get('rateMax') ? 'border-accent bg-accent-subtle' : 'border-border-strong bg-surface-raised'}`}
          >
            <option value="">Rate: any</option>
            <option value="40">Up to 40/hr</option>
            <option value="75">Up to 75/hr</option>
            <option value="120">Up to 120/hr</option>
            <option value="200">Up to 200/hr</option>
          </select>
        </span>

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

      <p aria-live="polite" className="sr-only">
        {isPending ? 'Updating results' : 'Results updated'}
      </p>
    </search>
  );
}
