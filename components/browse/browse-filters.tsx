'use client';

import { X } from '@phosphor-icons/react/ssr';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { ENGAGEMENT_LABEL, LOCATION_LABEL } from '@/components/shared/money';
import { FilterSelect } from '@/components/shared/filter-select';
import { SearchBar } from '@/components/shared/search-bar';
import { SkillFilter } from '@/components/shared/skill-filter';
import type { BrowseType } from '@/lib/schemas/search';
import type { SkillOption } from '@/lib/services/skills';
import { cn } from '@/lib/ui/cn';

const TYPES: [BrowseType, string][] = [
  ['all', 'All'],
  ['jobs', 'Jobs'],
  ['developers', 'Developers'],
];

/** Filters that only mean something for one type, dropped when the type changes. */
const TYPE_ONLY = ['engagement', 'locationType', 'experience', 'sort', 'availability', 'rateMax'];

/**
 * Browse filters. Jobs and developers used to be two pages with the same layout and the same
 * URL-as-state behaviour; they are one page now, and the type is just another filter.
 *
 * Search and skill apply to both types, so they are always shown. The rest appear only once a
 * type is chosen, because "Engagement: hourly" means nothing to a list of people.
 *
 * State lives in the URL, not in React: a filtered list is shareable and survives a refresh,
 * and the server component does the filtering, so there is no client fetch to keep in sync.
 */
export function BrowseFilters({
  type,
  skills,
}: {
  type: BrowseType;
  skills: [string, SkillOption[]][];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get('q') ?? '');

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('cursor'); // a filter change invalidates the page position
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  };

  /** The type tabs are links, so they work before hydration and open in a new tab. */
  const typeHref = (t: BrowseType) => {
    const next = new URLSearchParams(params.toString());
    for (const key of [...TYPE_ONLY, 'cursor']) next.delete(key);
    if (t === 'all') next.delete('type');
    else next.set('type', t);
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const hasFilters = ['q', 'skills', ...TYPE_ONLY].some((k) => params.get(k));

  return (
    <search className="space-y-4">
      {/* Underline tabs: 40px tall so each is a comfortable tap target, and the active one is
          marked by weight and a navy rule as well as colour. */}
      <nav aria-label="Show" className="flex gap-1 border-b border-border-base">
        {TYPES.map(([t, label]) => (
          <Link
            key={t}
            href={typeHref(t)}
            aria-current={type === t ? 'page' : undefined}
            className={cn(
              '-mb-px inline-flex h-10 items-center border-b-2 px-3 text-sm transition-colors duration-fast ease-out',
              type === t
                ? 'border-primary font-semibold text-text'
                : 'border-transparent font-medium text-text-muted hover:border-border-strong hover:text-text',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <SearchBar
        id="browse-search"
        label="Search"
        value={q}
        onChange={setQ}
        onSubmit={() => set('q', q.trim())}
        onClear={() => {
          setQ('');
          set('q', '');
        }}
        placeholder="Search by skill, title, or name…"
        pending={isPending}
      />

      {/* Phone: a grid, so every filter is a full-width 40px cell and nothing scrolls sideways.
          The app rail leaves ~264px at a 360px viewport, so one column there; two from a 416px
          viewport; from sm one wrapping row, each control sized to its value. */}
      <div className="grid grid-cols-1 gap-2 min-[26rem]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
        <SkillFilter
          skills={skills}
          value={params.get('skills') ?? ''}
          onChange={(v) => set('skills', v)}
          className="min-[26rem]:col-span-2"
        />

        {type === 'jobs' && (
          <>
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
          </>
        )}

        {type === 'developers' && (
          <>
            <Select
              label="Availability"
              value={params.get('availability') ?? ''}
              options={{ full_time: 'Full time', part_time: 'Part time', occasional: 'Occasional' }}
              onChange={(v) => set('availability', v)}
            />
            {/* A single "up to": a client browsing has a ceiling, not a floor. */}
            <Select
              label="Rate"
              value={params.get('rateMax') ?? ''}
              options={{
                '40': 'Up to 40/hr',
                '75': 'Up to 75/hr',
                '120': 'Up to 120/hr',
                '200': 'Up to 200/hr',
              }}
              onChange={(v) => set('rateMax', v)}
            />
          </>
        )}

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQ('');
              startTransition(() =>
                router.push(type === 'all' ? pathname : `${pathname}?type=${type}`),
              );
            }}
            className="pressable inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-semibold text-link hover:bg-surface-sunken min-[26rem]:col-span-2"
          >
            <X aria-hidden="true" size={15} />
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
