# Tasks: Status Drag Reorder

- **Feature ID:** 028-status-drag-reorder
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-190–Q-193** Decided (locked; amended for Kanban columns; **H** → `031`). Frontend-focused. Reuse existing reorder API. No Prisma/API. No task notes / **C**. Do not implement **H** here. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

Locked: Kanban **column** drag reorder required; `@dnd-kit/sortable` for columns only in 028; grab/grabbing on column chrome; Dialog keeps Move up/down (secondary); task-card status PATCH DnD unchanged; same-column remains no-op until `031`; no task-card sortable in 028; column vs card conflict via handles/activation/typed drag data.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `KanbanBoard.tsx` (DndContext, sensors, droppable columns, draggable cards), Statuses Dialog Move up/down, reorder client, `frontend/package.json`, and related tests. Record files to change and the chosen column-vs-card conflict approach. Confirm no schema/API need. Do not change product code in this task.
  - Evidence: Single board `DndContext`; conflict via header-only column `useSortable` listeners + typed `task` / `status-column` drag data + branched collision/drag-end; task droppables stay status-key `task-column`. Files: `KanbanBoard.tsx`, `TasksPanel.tsx`, `package.json`, Kanban/Statuses/deps tests. No schema/API.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-190–Q-193 Decided (Kanban columns required; Dialog up/down kept; **H** owned by `031`). Confirm non-goals. **Stop if artifacts are Draft.**
  - Evidence: All three artifacts Status Approved; Q-190–Q-193 Decided.

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only; reuse existing reorder API” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.
  - Evidence: N/A — frontend-only; reuse existing `reorderStatuses`.

### Phase 3 — Frontend

- [x] T004 Add `@dnd-kit/sortable` and required `@dnd-kit/utilities` to the frontend; document as explicit dependency (Q-191).
- [x] T005 Implement Kanban column drag reorder with `@dnd-kit/sortable`; grab/grabbing on column chrome; call existing `reorderStatuses` on column order change; handle failure revert/reload (AC-001, AC-004, FR-008).
- [x] T006 Disambiguate column drag vs task-card drag (handles and/or activation constraints + typed drag data / branched drag-end) so card status PATCH path stays unchanged (AC-002, AC-003).
- [x] T007 Ensure non-writers have no column drag; confirm Statuses Dialog Move up/down remain as secondary (AC-005, AC-006 / Q-193).
- [x] T008 Confirm no task-card sortable and no within-column rank in **028**; handoff to `031` documented in non-goals (AC-002, AC-007).
- [x] T009 Add/update frontend tests for AC-001–AC-007 as practical.

### Phase 4 — Verification

- [x] T010 Run targeted frontend tests; record commands and actual results.
  - Evidence: `npm test -- src/tasks/KanbanBoard.test.tsx src/tasks/StatusesDialog.test.tsx` → 33 passed (Node 22.22.3).
- [x] T011 Run frontend `npm run typecheck` and relevant `npm test` on Node 22; record results.
  - Evidence: Node v22.22.3; `npm run typecheck` exit 0; `npm test` → 34 files / 314 tests passed.
- [x] T012 Verify AC-001–AC-008 against the spec. Confirm no migration, constitution unchanged, non-goals held (**H** not implemented here).
  - Evidence: AC-001–AC-007 covered by tests/code; AC-008 Approved gate held; no Prisma/API; constitution untouched; same-column no-op; **H** deferred to 031.
- [x] T013 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none. AC-001–AC-008 verified. Low: column reorder/conflict tests use keyboard sensors (pointer path code-reviewed via header-only listeners + typed data). Low: FR-008 failure revert/reload implemented in `TasksPanel` without dedicated failure-path test. Informational: reviewer did not re-run suites (Ask/readonly); close-out re-ran Node 22.22.3 typecheck + targeted 33 + full 314.
- [x] T014 Update `memory.md` from verified state. Record Q-190–Q-193 (amended) and handoff to `031`. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - Evidence: `memory.md` updated (Verified 028; Q-190–Q-193; stack notes for column sortable; next Approved `031`). Catalog patch proposed in implementer return — `implemented-features.md` not edited. Catalog last confirmed through 018; 019–028 awaiting confirm if not applied.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes + conflict approach |
| T002 | T001 | Artifacts Approved; Q-190–Q-193 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | package.json |
| T005 | T004 | Column reorder + API call |
| T006 | T005 | Conflict + card PATCH unchanged |
| T007 | T005 | Write-gate; Dialog up/down present |
| T008 | T005, T006 | No task sortable in 028; handoff to 031 |
| T009 | T005, T006, T007, T008 | Frontend test results |
| T010 | T009 | Command log |
| T011 | T010 | Command log |
| T012 | T011 | AC checklist |
| T013 | T012 | Reviewer verdict |
| T014 | T013 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T005, T009, T012 | Reorder API call + column order |
| AC-002 | T006, T008, T012 | Card status PATCH unchanged; no **H** in 028 |
| AC-003 | T006, T009, T012 | Column vs card disambiguation |
| AC-004 | T005, T009, T012 | grab/grabbing on column chrome |
| AC-005 | T007, T009, T012 | canWrite=false |
| AC-006 | T007, T012 | Dialog Move up/down kept |
| AC-007 | T003, T008, T012 | No API/schema; **H** → 031 |
| AC-008 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T014
- Tests executed (Node 22.22.3): targeted Kanban/Statuses → 33 passed; full `npm test` → 34 files / 314 passed; `npm run typecheck` exit 0 (prior T010–T011 + T013 close-out re-run)
- Actual results: Column `@dnd-kit/sortable` + `reorderStatuses`; card status PATCH unchanged; Dialog Move up/down kept; no Prisma/API; constitution untouched; **H** deferred to 031
- Known issues: none blocking. Low: pointer column-reorder not separately simulated (keyboard + code review). Low: no dedicated FR-008 failure-path test (implementation present). Catalog awaiting user confirm.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T014); catalog propose only — **do not** edit `implemented-features.md` until user confirms
- Remaining work: next Approved delivery `031-within-column-rank`; user confirm catalog patch for 028 (and any pending 019–027 if not yet applied)
