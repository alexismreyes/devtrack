# Tasks: Pointer Cursors

- **Feature ID:** 034-pointer-cursors
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-208–Q-210** Decided. Frontend-only cursor polish. No notes/**C**/constitution/`implemented-features.md` edits (catalog propose only until user confirm).

Locked: Attachment pointer; Kanban idle pointer / dragging grabbing; status+label swatch pointer. Frontend-only.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect Attachment popover, Kanban card cursor classes, LabelColorSwatchPicker, and related tests. Record files. Confirm no schema/API need. Do not change product code.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-208–Q-210 Decided. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 N/A — frontend-only. Record evidence. If a contract gap appears, stop and amend artifacts.

### Phase 3 — Frontend

- [x] T004 Apply pointer classes to Attachment button/file picker (AC-001 / Q-208).
- [x] T005 Change Kanban card idle/hover to pointer; keep grabbing while dragging (AC-002–AC-003 / Q-209). Update tests that expected idle grab.
- [x] T006 Apply pointer to label/status color swatches (AC-004 / Q-210).
- [x] T007 Add/update frontend tests for AC-001–AC-005 as practical.

### Phase 4 — Verification

- [x] T008 Run targeted frontend tests; record commands and results.
- [x] T009 Run frontend typecheck and relevant full test suite on Node 22; record results.
- [x] T010 Verify AC-001–AC-006; confirm non-goals held.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Verdict: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
- [x] T012 Update `memory.md` from verified state. Propose catalog patch; **wait for user confirm** before `implemented-features.md`.
  - Evidence: `memory.md` updated; catalog propose only (034).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved |
| T003 | T002 | N/A evidence |
| T004 | T002 | Attachment classes |
| T005 | T002 | Kanban cursors |
| T006 | T002 | Swatch classes |
| T007 | T004–T006 | FE tests |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory; catalog propose only |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T007, T010 | Attachment pointer |
| AC-002 | T005, T007, T010 | Idle pointer |
| AC-003 | T005, T007, T010 | Dragging grabbing |
| AC-004 | T006, T007, T010 | Swatch pointer |
| AC-005 | T003, T010 | Frontend-only |
| AC-006 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T012
- Tests executed: Node 22.22.3 — targeted AttachmentsPopover/KanbanBoard/LabelColorSwatchPicker (42 pass); `npm run typecheck`; full `npm test` (35 files / 338 pass) [prior implementer T008–T010]
- Actual results: All green. Attachment file input `cursor-pointer file:cursor-pointer`; Kanban idle `cursor-pointer` / dragging `cursor-grabbing`; swatches `cursor-pointer`. No schema/API.
- Known issues: none blocking
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no.
- Memory updated: yes (T012)
- Remaining work: none (catalog patch awaits user confirm)
