# Tasks: UI Polish

- **Feature ID:** 019-ui-polish
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-151–Q-154** Decided (locked). Plan/tasks are aligned. Frontend-only. No Prisma/API. No task notes / 020 covers / 021 pagination / 022 charts / **H** / **C**. Do not change `constitution.md`.

Locked Q-154: activation-distance / cancel-on-click; completed drag MUST NOT open TaskDetail.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect `button.tsx`, `AuthenticatedLayout.tsx`, `KanbanBoard.tsx` card open/DnD wiring, and related tests. Record files to change. Confirm no schema/API need. Do not change product code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-151–Q-154 Decided (incl. activation-distance; no TaskDetail on completed drag). Confirm non-goals. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.

### Phase 3 — Frontend

- [x] T004 Add pointer/hand cursor baseline for product buttons (and links as needed) per Q-151 / AC-001.
- [x] T005 Add authenticated top-bar **Projects** → `/projects` alongside **Dashboard** (Q-153 / AC-004). Keep DevTrack brand → `/projects`.
- [x] T006 Make entire Kanban task card open TaskDetail (Q-152 / AC-002); preserve status-only DnD and prevent drag completion from opening detail (Q-154 / AC-003). Fix nested-interactive a11y.
- [x] T007 Add/update frontend tests for AC-001–AC-005.

### Phase 4 — Verification

- [x] T008 Run targeted frontend tests; record commands and actual results.
- [x] T009 Run frontend `npm run typecheck` and full frontend `npm test` on Node 22; record results.
- [x] T010 Verify AC-001–AC-006 against the spec. Confirm no migration, constitution unchanged, non-goals held.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Reviewer: **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. Failed ACs: none.
- [x] T012 Update `memory.md` from verified state. Record Q-151–Q-154. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-151–Q-154 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | Cursor tests |
| T005 | T002 | Nav href tests |
| T006 | T002 | Whole-card + DnD tests |
| T007 | T004, T005, T006 | Frontend test results |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T007, T010 | Pointer cursor — `button-cursor.test.tsx`, App link classes |
| AC-002 | T006, T007, T010 | Whole-card open — KanbanBoard tests (priority click) |
| AC-003 | T006, T007, T010 | Drag vs open — status drag + active-drag suppress tests |
| AC-004 | T005, T007, T010 | Projects nav — App.test href + click |
| AC-005 | T003, T010 | No API/schema — git status clean for prisma/constitution |
| AC-006 | T002 | Approval gate — artifacts Approved |

## Completion report

- Completed tasks: T001–T012
- Tests executed:
  - `nvm` Node 22.22.3; `npm test -- --run` button-cursor / KanbanBoard / App / TasksPanel (63 passed)
  - `npm run typecheck` (pass)
  - full `npm test` (28 files, 267 passed)
- Actual results: all green on Node 22
- Known issues: pointer click-after-drag relies on activation-distance + suppress ref; automated pointer DnD sequence not separately asserted beyond keyboard drag + active-drag click suppress
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no
- Memory updated: yes (T012); `implemented-features.md` catalog patch proposed — await user confirm before edit
- Remaining work: none in this folder; catalog/prompt edits only after explicit user confirmation
