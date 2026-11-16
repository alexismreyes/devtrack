# Implementation Plan: Pointer Cursors

- **Feature ID:** 034-pointer-cursors
- **Specification:** `spec.md`
- **Status:** Verified

Inspected 2026-11-11. Frontend-only. Q-208–Q-210 Decided. No Prisma/API.

## 1. Summary

Add pointer classes on Attachment controls and color swatches; change Kanban card idle cursor from grab to pointer while keeping grabbing during active card drag.

## 2. Current State

- `AttachmentsPopover.tsx`: Attachment `Button` already inherits 019 `cursor-pointer`; file `input` lacks `cursor-pointer` / `file:cursor-pointer`.
- `KanbanBoard.tsx` card: idle sortable uses `cursor-grab`; dragging uses `cursor-grabbing`; non-sortable/disabled paths use pointer.
- `LabelColorSwatchPicker.tsx`: swatch `<button>`s lack explicit `cursor-pointer`.
- Column headers already grab/grabbing (028/032) — leave alone.

## 3. Domain Boundaries

- Owning domain: **frontend presentation** only.
- Controllers/services/repos: **no changes**.

## 4. API Contract

None.

## 5. Persistence

None.

## 6. Frontend

- Attachment file input: add `cursor-pointer file:cursor-pointer` (mirror 030). Keep Attachment Button as-is if already pointer; assert in tests.
- Kanban cards: idle/hover → `cursor-pointer` even when sortable; `isDragging` → `cursor-grabbing`; preserve listeners, suppress-select, overlay.
- Swatches: add `cursor-pointer` to enabled swatch buttons in `LabelColorSwatchPicker` (covers status + label usages).

## 7. Files

- `frontend/src/tasks/AttachmentsPopover.tsx` (+ tests)
- `frontend/src/tasks/KanbanBoard.tsx` (+ `KanbanBoard.test.tsx`)
- `frontend/src/tasks/LabelColorSwatchPicker.tsx` (+ tests)

## 8. Dependencies and Config

None.

## 9. Security and Failures

No new authz.

## 10. Testing

- Class asserts for Attachment file input, Kanban idle pointer + dragging grabbing, swatch pointer.
- Update any tests that currently expect card `cursor-grab` when idle.

## 11. Sequence

1. Inspect + Approved gate.
2. Attachment + swatches + Kanban cursor edits.
3. Tests, typecheck, AC verify, review, memory.

## 12. Risks

- Tests asserting idle `cursor-grab` will need updates (expected).
- Alternatives: keep idle grab (rejected — Q-209).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Attachment classes | FE tests |
| AC-002–AC-003 | Kanban card classes | KanbanBoard tests |
| AC-004 | Swatch classes | LabelColorSwatchPicker tests |
| AC-005–AC-006 | Scope / process | Review |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes (documented)
- Approved for task breakdown: Yes
- Approved for implementation: Yes
