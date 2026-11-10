# Implementation Plan: Status Drag Reorder

- **Feature ID:** 028-status-drag-reorder
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec **Q-190–Q-193** are **Decided** (locked; amended for Kanban columns; **H** owned by `031`). Plan/tasks align to those answers. Frontend-focused. Reuse existing reorder API. No Prisma/API contract change. No task notes / **C**. Do not implement **H** here. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

## 1. Summary

Add `@dnd-kit/sortable` (plus required `@dnd-kit/utilities` peer) so OWNER/EDITOR can **drag-reorder Kanban columns** on the board. On drop, call existing `reorderStatuses(projectId, { statusIds })`. Show `cursor-grab` / `cursor-grabbing` on column chrome. Keep Statuses Dialog Move up/down as secondary. Preserve existing task-card `@dnd-kit/core` status PATCH DnD (same-column still no-op). Do **not** add task-card sortable or task rank in this folder — that is Approved `031-within-column-rank` (**H**).

## 2. Current State

Inspected 2026-11-10 (post Verified 027; amended Draft after Q-190 correction and **H** handoff to 031):

- `frontend/src/tasks/StatusesDialog.tsx` — list with Edit / Move up / Move down / Delete; `onMove` swaps adjacent ids then `reorderStatuses`.
- `frontend/src/api/client.ts` — `reorderStatuses` PUT full `statusIds` (018 Verified).
- `frontend/package.json` — `@dnd-kit/core` present; **`@dnd-kit/sortable` absent** (until 028).
- `frontend/src/tasks/KanbanBoard.tsx` — single `DndContext` + `PointerSensor` activation distance 8 + `DragOverlay`; columns are `useDroppable` by status key; cards are `useDraggable`; same-column drop no-op; no sortable; no task `position`/`rank`.
- Catalog column order already follows `ProjectStatus.position` from list/reorder.
- Task list order today is `createdAt` desc (backend); within-column persistence deferred to `031`.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** for column DnD UX; persistence/authz remain Verified **`tasks`** reorder use-case (unchanged).
- Other domains: none.
- Invariants: full-list reorder; keys/names/colors/`isCompleted` unchanged by reorder; write = OWNER+EDITOR.
- Cross-domain interfaces: none new.
- Controllers/services/repos: **no changes**.

## 4. API Contract

No new endpoints and no intentional contract changes.

| Method / path | Auth | Notes |
| --- | --- | --- |
| Existing statuses reorder (018) | session + task write | Unchanged body `{ statusIds: string[] }` |
| Existing task PATCH status (006) | session + task write | Unchanged card drop behavior in 028 |

If a contract gap appears, **stop** and amend artifacts.

## 5. Persistence

- Prisma model changes: **none** in 028
- Migration implications: **none** in 028
- Compatibility risks: UI-only; catalog `position` still via existing API
- Task `position` / rank migration: **031 only**

## 6. Frontend

### Dependencies

- Add `@dnd-kit/sortable` and `@dnd-kit/utilities` (peer of sortable) to `frontend` only. Justify: horizontal column reorder needs sortable primitives on top of existing `@dnd-kit/core`. Do not add a second DnD family.
- 028 may leave `@dnd-kit/sortable` installed for column use; **031** will reuse it for cards (no second library).

### Kanban column sortable (primary)

- Wrap the columns list in `SortableContext` (horizontal strategy) inside the existing board `DndContext`, **or** nest contexts carefully if a single-context approach proves cleaner after inspect — prefer one board `DndContext` with distinct drag `data.type` for `column` vs `task`.
- Each column becomes a sortable item via `useSortable` (column id = catalog status id).
- Attach sortable listeners only to **column chrome** (header and/or dedicated handle), not to the task list / card faces.
- Apply `cursor-grab` when idle/draggable and `cursor-grabbing` while column-dragging on that chrome (Q-192).
- On drag end with column order change: call `reorderStatuses` with full status id list; update local columns / notify catalog consumers as today.
- On failure: revert optimistic order or reload; keep existing error/conflict/unauth handling.
- When `canWrite=false`, columns are static (no column sortable listeners).

### Column vs card DnD conflict (required)

- **Handles:** column reorder starts only from header/handle; cards keep their own `useDraggable` listeners.
- **Activation:** keep or tune pointer activation distance so click-to-open (019) and Add-task clicks still work; do not let column sensors capture card pointer downs.
- **Drag data / handlers:** branch `onDragStart` / `onDragEnd` by `data.type` (`task` vs `column`). Column end → reorder API; task end → existing status PATCH path only.
- **Overlay:** column drag may use a simple overlay or transform; must not break existing task `DragOverlay`.
- **Droppables:** column droppable targets for **tasks** remain status-key droppables; sortable collision for columns must not mis-fire as a task status change.

### Statuses Dialog (secondary)

- **Keep** Move up / Move down (Q-193). Do not remove them in this feature.
- Do **not** require Dialog `@dnd-kit/sortable` in this scope.

### Out of scope surfaces (handoff)

- Do not add `@dnd-kit/sortable` to task cards in 028.
- Do not persist within-column task order — owned by `031-within-column-rank` (**H**).

## 7. Files

Expected touch set (inspect may refine):

- `frontend/package.json` / lockfile — `@dnd-kit/sortable`, `@dnd-kit/utilities`
- `frontend/src/tasks/KanbanBoard.tsx` (and any column subcomponent) — column `useSortable`; conflict branching; grab/grabbing on chrome; reorderStatuses on column drop
- Board/Kanban tests — column reorder API call; write-gate; card DnD regression; conflict/activation as practical
- `StatusesDialog.tsx` — **no required behavioral change** (Move up/down stay); touch only if shared catalog refresh wiring needs a hook
- Possibly small helper for sortable column ids / drag-type guards

## 8. Dependencies and Config

- New packages: `@dnd-kit/sortable`, `@dnd-kit/utilities` (required peer). Keep existing `@dnd-kit/core`.
- Env / Docker / Prisma: **none**

## 9. Security and Failures

- No new authz surface; UI column drag gated by `canWrite` but backend remains authoritative.
- Reorder failures must not leave a silently wrong persisted order relative to UI (reload/revert).

## 10. Testing

- Frontend: column drag/reorder success calls `reorderStatuses` with expected `statusIds`; non-writer has no column drag; grab/grabbing on column chrome; task cross-column PATCH path still covered/regression-safe; Dialog Move up/down still present; same-column still no-op in 028.
- Backend: none expected.

## 11. Sequence

1. Inspect + confirm Approved gate.
2. Add npm packages.
3. Implement Kanban column sortable + conflict guards + cursors + reorderStatuses.
4. Confirm Dialog Move up/down unchanged; confirm task-card DnD unchanged (same-column no-op).
5. Frontend tests, typecheck, AC verify, review, memory.
6. Delivery handoff: next Kanban Approved is `031` before `029`/`030`.

## 12. Risks

- Single `DndContext` mixing sortable columns and draggable cards — mitigate with typed drag data, handle-only column listeners, and branched drag-end.
- Nested controls on column headers (Add task) — mitigate with dedicated handle and/or activation constraints.
- Accidental task-card sortable / **H** creep in 028 — mitigate via non-goals pointing to `031` and AC-002 / AC-007.
- Alternatives considered (rejected or superseded): Dialog-only drag (superseded Q-190); replace Dialog Move up/down (superseded Q-193); task-card sortable **H** in 028 (deferred to `031`).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Kanban column sortable + reorderStatuses | Board tests |
| AC-002 | Card DnD path unchanged in 028 | Regression / review |
| AC-003 | Handles + typed drag-end | Conflict tests / review |
| AC-004 | cursor-grab / cursor-grabbing on chrome | Class asserts |
| AC-005 | canWrite gate | Board tests |
| AC-006 | Dialog Move up/down kept | Dialog smoke / review |
| AC-007 | No API/Prisma; **H** → 031 | Review |
| AC-008 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes (executed T001–T014)
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
