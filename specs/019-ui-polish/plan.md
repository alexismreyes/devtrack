# Implementation Plan: UI Polish

- **Feature ID:** 019-ui-polish
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-151–Q-154** are **Decided** (locked). Plan/tasks are aligned to those answers. Frontend-only. No Prisma/API. No task notes / covers / pagination / charts / **H** / **C**. Do not change `constitution.md`.

## 1. Summary

Three frontend polish items after Verified `018`:

1. Baseline **pointer cursor** on shadcn `Button` (and product links as needed) (Q-151).
2. Promote Kanban open-task from title-only `Button` to **whole-card** activation, preserving status-only DnD (Q-152 + Q-154).
3. Add authenticated top-bar **Projects** → `/projects` next to **Dashboard** (Q-153).

## 2. Current State

Inspected 2026-11-09 (post Verified 018):

- `frontend/src/components/ui/button.tsx` — `buttonVariants` has no `cursor-pointer`; browsers may show default cursor on buttons.
- `frontend/src/layout/AuthenticatedLayout.tsx` — DevTrack → `/projects`; **Dashboard** → `/dashboard`; no **Projects** text nav.
- `frontend/src/tasks/KanbanBoard.tsx` — `KanbanCard` wrapper has `cursor-pointer` + dnd listeners; `KanbanCardFace` opens detail only via title `Button` `onClick` → `onSelectTask`.
- Task cards already tested for `cursor-pointer` on the draggable wrapper; open-task coverage assumes title control.
- No backend changes required for this folder.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** only (no new backend domain).
- Other domains: none touched.
- Invariants: Verified Kanban status PATCH + authz unchanged.
- Cross-domain interfaces: none new.
- Dependency direction: UI → existing React Router + existing task open callbacks.
- Controllers/services/repos: **no changes**.

## 4. API Contract

No new endpoints and no intentional contract changes.

| Method / path | Auth | Notes |
| --- | --- | --- |
| Existing task/project routes | as Verified | Unchanged |

If a contract gap appears, **stop** and amend artifacts.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**
- Compatibility risks: none beyond UI

## 6. Frontend

### Cursor (Q-151)

- Add `cursor-pointer` to shared `buttonVariants` base (and ensure disabled path keeps `disabled:pointer-events-none` / non-active cursor).
- Ensure primary router `Link` nav items use pointer (Tailwind `cursor-pointer` if not inherited).
- Prefer one baseline change over hunting every call site.

### Whole-card open (Q-152 / Q-154)

- Move open-task handler to the card container (or make face clickable) so priority/due/labels/cover participate.
- Keep title readable; avoid nested interactive button-inside-button a11y issues (prefer single activatable surface + keyboard focus on the card control).
- Integrate with `@dnd-kit` so drag completion does not open detail (activation-distance / cancel-on-click per locked Q-154).
- Preserve VIEWER read open; preserve disabled drag when not writable.

### Projects nav (Q-153)

- In `AuthenticatedLayout` header actions, add `Link` **Projects** `to="/projects"` beside **Dashboard**.
- Keep brand link. Do not change guest layout.

## 7. Files

Expected touch set (inspect may refine):

- `frontend/src/components/ui/button.tsx` — pointer baseline
- `frontend/src/layout/AuthenticatedLayout.tsx` — Projects nav
- `frontend/src/tasks/KanbanBoard.tsx` — whole-card open + drag/click
- Related tests: `KanbanBoard.test.tsx`, `TasksPanel.test.tsx`, `App.test.tsx` / layout tests

## 8. Dependencies and Config

- New packages: **none**
- Env / Docker: **none**

## 9. Security and Failures

- No new authz surface.
- Do not treat UI-only open as authorization.

## 10. Testing

- Unit/UI: Button has pointer class; Projects link href; whole-card open from non-title region; drag does not open (Q-154).
- No backend suite required unless accidental shared-type touch (not expected).

## 11. Sequence

1. Inspect + confirm Approved gate (T002).
2. Button/link cursor baseline.
3. Projects nav.
4. Whole-card open + drag/click.
5. Frontend tests, typecheck, AC verify, review, memory.

## 12. Risks

- Nested button a11y if title `Button` remains inside a clickable card — mitigate by single interactive surface.
- Drag/click races — mitigate via Q-154 activation distance.
- Alternatives considered: title-only (rejected Q-152); brand-only Projects navigation (rejected Q-153).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `buttonVariants` / Link classes | Frontend tests |
| AC-002 | Kanban card open handler | KanbanBoard tests |
| AC-003 | dnd activation vs click | Interaction tests |
| AC-004 | AuthenticatedLayout Links | App/layout tests |
| AC-005 | No backend/migration | Review |
| AC-006 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
