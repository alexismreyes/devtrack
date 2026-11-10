# Tasks: Kanban Column DnD Polish

- **Feature ID:** 032-kanban-column-dnd-polish
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Spec **Q-201–Q-204** Decided (user locks). Implementation may proceed on the approved task list only (delivery order 032 → 033). Frontend-only. No Prisma/API. Preserve card cross-column DnD, within-column sortable (031), column vs card disambiguation, non-writer no column drag. No notes/**C**/constitution/`implemented-features.md` edits. Do not implement 033 here.

Locked: entire header strip = column handle + soft status-color tint (Q-204); Trello-like free-follow mouse DragOverlay + horizontal final placement + rail ghost (Q-202); compact tinted chrome overlay preview, not live card clone (Q-203).

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `KanbanBoard.tsx` column handle/overlay/sortable transforms, card sortable paths, and related tests. Record files to change and the chosen free-overlay + rail-ghost approach. Confirm no schema/API need. Do not change product code in this task.
  - Evidence: Touch `KanbanBoard.tsx`, `labelColors.ts` (soft tint helper), `KanbanBoard.test.tsx`. Approach: free-follow `DragOverlay` compact chrome + rail ghost (`data-kanban-column-ghost` / silhouette) while keeping horizontal sortable transforms + existing `reorderStatuses`. No schema/API.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-201–Q-204 Decided (user locks). Confirm non-goals. **Stop if artifacts are Draft.**
  - Evidence: All three Status: Approved; Q-201–Q-204 Decided; non-goals held (frontend-only, no 033 / constitution / implemented-features).

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.
  - Evidence: N/A — frontend-only; no contract gap.

### Phase 3 — Frontend

- [x] T004 Expand column drag listeners to the **entire top header strip**; keep grab/grabbing; keep Add/task list outside the handle (AC-001, AC-006).
- [x] T005 Tint/colorize the header strip using the column status color with readable contrast; keep status identity cues (AC-002 / Q-201 / Q-204).
- [x] T006 Implement Trello-like free-follow mouse column `DragOverlay` (compact tinted chrome preview) plus rail placeholder/ghost; keep horizontal final placement + `reorderStatuses` (AC-003 / Q-202 / Q-203).
- [x] T007 Preserve column vs card disambiguation and Verified 031 card cross-column / within-column behaviors; non-writer no column drag (AC-004, AC-005, AC-006).
- [x] T008 Add/update frontend tests for AC-001–AC-007 as practical.

### Phase 4 — Verification

- [x] T009 Run targeted frontend Kanban tests; record commands and actual results.
  - Command (Node 22.22.3): `npx vitest run src/tasks/KanbanBoard.test.tsx` → 38 passed.
- [x] T010 Run frontend `npm run typecheck` and relevant `npm test` on Node 22; record results.
  - Node 22.22.3: `npm run typecheck` exit 0; `npm test` → 34 files / 333 passed.
- [x] T011 Verify AC-001–AC-008 against the spec. Confirm no migration/API/constitution drift; non-goals held.
  - AC-001–AC-006 covered by KanbanBoard tests; AC-007 no Prisma/API/constitution/`implemented-features`/033 edits; AC-008 Approved gate used.
- [x] T012 Obtain independent review and resolve blocking findings.
  - Verdict: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
  - Low: AC-003 free-follow asserted via overlay/ghost DOM + no axis `modifiers` (not pointer vertical travel); acceptable “as practical.”
  - Informational: some test titles still cite older AC ids; reviewer did not re-run suites (Ask/readonly).
- [x] T013 Update `memory.md` from verified state. Record Q-201–Q-204. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Note handoff to `033`.
  - Evidence: `memory.md` updated; catalog propose only; handoff to Approved `033-dark-theme-retune`.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-201–Q-204 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | Header-strip handle |
| T005 | T004 | Status tint |
| T006 | T004 | Overlay + ghost + horizontal order |
| T007 | T004, T006 | Conflict + card regressions + write-gate |
| T008 | T004, T005, T006, T007 | Frontend test results |
| T009 | T008 | Command log |
| T010 | T009 | Command log |
| T011 | T010 | AC checklist |
| T012 | T011 | Reviewer verdict |
| T013 | T012 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T008, T011 | Header-strip handle + cursors |
| AC-002 | T005, T008, T011 | Status tint |
| AC-003 | T006, T008, T011 | Trello-like free-follow overlay + ghost + horizontal final placement |
| AC-004 | T007, T008, T011 | Column vs card |
| AC-005 | T007, T008, T011 | Card DnD regressions |
| AC-006 | T004, T007, T008, T011 | Non-writer |
| AC-007 | T003, T011 | Frontend-only / non-goals |
| AC-008 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T013
- Tests executed: `npx vitest run src/tasks/KanbanBoard.test.tsx`; `npm run typecheck`; `npm test` (Node 22.22.3)
- Actual results: KanbanBoard 38/38 passed; typecheck exit 0; full frontend suite 333/333 passed
- Known issues: Low residual — AC-003 free-follow not pointer-travel asserted (DOM + no axis modifiers); informational stale AC titles in a few tests
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.
- Memory updated: yes (T013). Catalog propose only — wait for user confirm before `implemented-features.md`.
- Remaining work: none for 032; handoff to Approved `033-dark-theme-retune`

