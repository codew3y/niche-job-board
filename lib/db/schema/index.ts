/**
 * Phase 1 schema — Drizzle-first (PROJECT.md §5.1).
 *
 * The schema files ARE the spec: the ERD in docs/schema.md is generated from them, not
 * maintained alongside them. A hand-drawn ERD drifts from a strict-TypeScript schema within
 * a week.
 *
 * Structural decisions worth knowing before reading:
 *   - Roles are separate profile tables linked to one auth user, never a role column. That is
 *     what makes dual-role accounts work without a flag leaking into every query.
 *   - Portfolio evidence is optional on both routes; at least one is required to publish, and
 *     the gate is a CHECK constraint, not just a Zod refinement (ADR-004).
 *   - RLS is default-deny on every table. Policies live next to the table they protect so a
 *     new column cannot be added without its policy being in view.
 */
export * from './enums';
export * from './identity';
export * from './skills';
export * from './talent';
export * from './jobs';
export * from './applications';
export * from './messaging';
export * from './engagement';
