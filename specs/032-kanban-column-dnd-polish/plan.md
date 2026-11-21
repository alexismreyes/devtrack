# Implementation Plan: Kanban Column DnD Polish

- **Feature ID:** 032-kanban-column-dnd-polish
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Spec **Q-201–Q-204** Decided (user locks). Implementation may proceed on the approved task list only (delivery order 032 → 033). Frontend-only. No Prisma/API. Preserve 028/031 DnD contracts. No notes/**C**/constitution/`implemented-features.md` edits. Palette catalog belongs to `033`.

## 1. Summary

Polish Verified Kanban **column** drag UX in `KanbanBoard.tsx`: expand the drag handle to the full top header strip with soft status-color tint (Q-204); replace the compact name-only column overlay with a **Trello-like free-follow mouse `DragOverlay`** (compact tinted chrome preview, Q-203) while **final placement stays horizontal** on the rail with a placeholder/ghost (Q-202). Leave card cross-column and within-column paths from 031 intact.

## 2. Current State

Inspected 2026-11-10 (post Verified 028/031):

- `frontend/src/tasks/KanbanBoard.tsx` — single `DndContext`; typed `status-column` vs `task`; column `useSortable` + horizontal `SortableContext`; card within-column `useSortable`; task droppables by status key; `DragOverlay` for cards (full face) and columns (muted name chip only).
- Column handle today: inline muted pill inside `h4` with listeners; small status color swatch via `labelChipClassName(column.color)`; column container uses `opacity-60` while dragging (transform still applied via sortable).
- Persistence unchanged: `onReorderColumns` → existing `reorderStatuses`; cards → PATCH status / PUT tasks reorder.
- Packages: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` already present.

## 3. Domain Boundaries

- Owning concern: **frontend presentation** (Kanban column DnD polish).
- Other domains: none.
- Invariants: catalog reorder still full `statusIds`; write = OWNER+EDITOR via existing UI gate + backend.
- Cross-domain interfaces: none new.
- Controllers/services/repos: **no changes**.

## 4. API Contract

No new endpoints and no intentional contract changes.

| Method / path | Auth | Notes |
| --- | --- | --- |
| Existing statuses reorder (018/028) | session + task write | Unchanged |
| Existing task PATCH status / tasks reorder (006/031) | session + task write | Unchanged card paths |

If a contract gap appears, **stop** and amend artifacts.

## 5. Persistence

- Prisma model changes: **none**
- Migration implications: **none**
- Compatibility risks: UI-only

## 6. Frontend

### Header strip handle + tint (Q-201)

- Expand column listeners/attributes from the current inline pill to the **full top header strip** (`h4` / dedicated strip spanning column width).
- Apply status-color **tint** to that strip background using existing status `color` token mapping (`labelColors` / related utilities). Keep readable title contrast; keep or restyle the swatch.
- Keep `cursor-grab` / `cursor-grabbing` on the strip when `columnsSortable`.
- Do **not** attach column listeners to the task list or Add button.

### Trello-like free-follow overlay + horizontal final placement + rail ghost (Q-202, Q-203)

- While `activeDrag.type === "status-column"`, render a **free-follow mouse** `DragOverlay` that tracks the pointer in any direction (not rail-locked). Content: compact column chrome preview (tinted header + muted body silhouette / name) — not a live card list (Q-203).
- On the rail, show a **placeholder/ghost** for the source column (opacity / empty shell). Prefer suppressing visible “live” translate of the source item so the overlay is the free preview and the rail ghost is stable (dnd-kit pattern: hide/opacity source + overlay).
- Keep `horizontalListSortingStrategy` / column-only collision branching so **final placement / order** stays horizontal among column ids (Trello-like feel = free overlay + horizontal final).
- Keyboard left/right column reorder from 028 SHOULD remain.

### Preserve 031 card paths

- Do not change typed drag-end branching for tasks, within-column reorder, cross-column append, or filter omit of card reorder.
- Re-assert conflict tests: header strip → column; card → task.

## 7. Files

Expected touch set (inspect may refine):

- `frontend/src/tasks/KanbanBoard.tsx` — header strip handle, tint, overlay, rail ghost, transform/opacity during column drag
- Possibly small helper for status-tint class mapping (same file or adjacent util)
- `frontend/src/tasks/KanbanBoard.test.tsx` — handle/tint/overlay/ghost/write-gate/conflict/card regressions
- No backend files

## 8. Dependencies and Config

- New packages: **none** (reuse existing `@dnd-kit/*`)
- Env / Docker / Prisma: **none**

## 9. Security and Failures

- No new authz surface; keep `columnsSortable` / `canWrite` gating.
- Reorder failures: keep revert/reload via existing board wiring.

## 10. Testing

- Frontend: header strip has handle + grab classes when writable; tint/status-color cue present; column overlay slot renders during column drag; rail ghost/placeholder behavior asserted as practical; non-writer no handle; column vs card conflict; card cross-column / within-column regressions.
- Backend: none expected.

## 11. Sequence

1. Inspect + confirm Approved gate.
2. Header strip handle + status tint.
3. Trello-like free-follow column DragOverlay + rail ghost; keep horizontal final placement.
4. Regression pass for card DnD + write-gate.
5. Frontend tests, typecheck, AC verify, review, memory.
6. Handoff to `033-dark-theme-retune`.

## 12. Risks

- Mixing free overlay with sortable transforms can look “double dragged” — mitigate by source ghost + overlay-only free preview.
- Header tint contrast on light/dark palettes — mitigate with soft tint + readable foreground (Q-204).
- Accidental listener bleed to cards/Add — mitigate with strip-only listeners and conflict tests.
- Alternatives considered (rejected): horizontal-locked overlay only (superseded by Q-202); tiny pill handle only (superseded by Q-201).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Full header strip listeners + cursors | Board tests |
| AC-002 | Status-color header tint | Class/DOM asserts |
| AC-003 | Trello-like free-follow overlay + rail ghost + horizontal final placement | Overlay/ghost + reorder tests |
| AC-004 | Typed listeners / drag-end | Conflict tests |
| AC-005 | Unchanged card paths | Regression tests |
| AC-006 | columnsSortable false | Write-gate tests |
| AC-007 | No API/Prisma | Review |
| AC-008 | Approval gate | Process |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
