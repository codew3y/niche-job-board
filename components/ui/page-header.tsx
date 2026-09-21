import type { ReactNode } from 'react';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-text-muted text-pretty">{subtitle}</p>}
    </div>
  );
}
