# Implementation Plan: Dashboard v2

- **Feature ID:** 022-dashboard-v2
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-169–Q-176** Decided (locked). Plan/tasks are aligned to those answers. T001–T012 complete. Prefer existing `GET /api/dashboard` (no extension). Add **Recharts**. Owner-scoped. No task notes / **H** / **C**. Do not change `constitution.md`.

Locked constraints: chart mode session/page UI state only (Q-174); labeled chart region + keep numeric summaries visible (Q-175); pie/donut = owner-wide pending/completed/overdue slices with overdue∩pending overlap noted (Q-176).

## 1. Summary

Augment Verified `/dashboard` with:

1. Default **stacked bar** chart: per-project pending/completed/overdue from `projects[]`.
2. Alternate **pie/donut** (owner-wide totals, Q-176).
3. Explicit npm dependency **`recharts`**.

Backend unchanged under Decided Q-172.

## 2. Current State

Inspected 2026-11-09:

- `GET /api/dashboard` returns owner-wide counts + `projects: [{ id, name, taskCount, pendingCount, completedCount, overdueCount }]`
- Frontend dashboard page shows numeric summaries; **no chart library** in package.json
- Aggregations live in `tasks` use-case; no `dashboard` domain; pending/completed via `isCompleted` (018)
- Authenticated `/dashboard` + nav link exist (008)

## 3. Domain Boundaries

- Owning domain for aggregates: **`tasks`** (unchanged use-case)
- Charts: **frontend-only** presentation
- No new domain, no Prisma dashboard model
- Cross-domain: none new

## 4. API Contract

### Preferred (locked Q-172)

No changes. Reuse:

```
DashboardSummaryResponseDto {
  projectCount, taskCount, pendingCount, completedCount, overdueCount,
  projects: [{ id, name, taskCount, pendingCount, completedCount, overdueCount }]
}
```

### Mapping

- Stacked bars: X = project `name` (id as key); stacks = pending/completed/overdue counts
- Pie/donut (locked Q-176): three slices from owner-wide pending/completed/overdue (categories; pending∩overdue overlap allowed)

If implementation discovers a true data gap, **stop** and amend artifacts — do not silently invent endpoints.

## 5. Persistence

- None (chart mode not persisted; Q-174)

## 6. Frontend

- Add `recharts` to `frontend/package.json` with lockfile update via npm
- Dashboard page: keep 008 summary counts visible (Q-175); add labeled chart region below/beside
- Default mode: stacked `BarChart` / stacked bars
- Toggle: pie vs donut vs bars per Q-174/Q-176 (simple control; session/page UI state only)
- Empty: no misleading fake data
- Use palette-friendly series colors via CSS variables where practical; avoid new purple-on-white theme system
- Loading/error paths unchanged aside from chart mount after data arrives
- `credentials: 'include'` via existing `getDashboard()`

## 7. Files

- `frontend/package.json` / lockfile — recharts
- `frontend/src/.../DashboardPage` (or current dashboard component path) + chart child component(s)
- Tests for mode default, mapping from fixture DTO, empty state
- Optional: short note in memory/plan dependency section only (no constitution edit)

## 8. Dependencies and Config

- **New:** `recharts` (explicit Decided Q-171)
- Justify: React chart primitives suitable for educational stacked bar + pie/donut without a second CSS framework
- Alternatives considered: Chart.js, Nivo, custom SVG — rejected unless Approve amends Q-171
- Env/Docker: none
- Backend packages: none expected

## 9. Security and Failures

- No API widening of owner scope
- Chart failures (render) should not leak stack traces to users
- Do not compose unauthorized task lists client-side

## 10. Testing

- Frontend: default stacked bars from fixture; toggle pie/donut; empty projects; owner fixture isolation (UI level)
- Backend: no change expected; smoke existing dashboard SuperTest only if desired

## 11. Sequence

1. Confirm Approved gate (T002)
2. Confirm payload mapping (no API change)
3. Add recharts dependency
4. Implement charts + toggle + empty
5. Frontend tests, typecheck, review, memory (document dependency decision)

## 12. Risks

- Pending∩overdue overlap makes pie slices non-partition of taskCount — document in UI copy/legend (locked Q-176)
- Recharts bundle size — acceptable for educational app; monitor build
- Alternatives: extend API with chartSeries (unnecessary if DTO sufficient); membership dashboard (rejected Q-173)

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | stacked bars | Frontend tests |
| AC-002 | pie/donut toggle | Frontend tests |
| AC-003 | getDashboard only | Client assert |
| AC-004 | owner scope | Existing API + UI |
| AC-005 | empty | Frontend tests |
| AC-006 | recharts dep | package.json review |
| AC-007–AC-008 | scope/process | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes (T001–T012)
