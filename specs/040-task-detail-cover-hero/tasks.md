# Tasks: TaskDetail Cover Hero

- **Feature ID:** 040-task-detail-cover-hero
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: TaskDetail Dialog top cover hero when 017 `cover` set; `max-h-36` `object-cover`; non-interactive hero; flush top + dialog corner radii; null → no hero; reuse 017 only (no second cover system). Deliver after 034→039. No notes/**C**/constitution/catalog until confirm.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect TaskDetail Dialog shell (`TasksPanel` DialogContent), Kanban cover fetch pattern, and `applyCover` paths. Record files and layout approach for flush-top hero. Do not change product code.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-237–Q-242 Decided (`max-h-36` `object-cover`; hero non-interactive). Confirm 034–039 predecessors done or user-approved reorder. **Stop if artifacts are Draft.**

### Phase 2 — Backend

- [x] T003 N/A — frontend-only over Verified 017 cover. Record evidence. If a contract gap appears, stop and amend artifacts (do not invent a second cover system).

### Phase 3 — Frontend

- [x] T004 Adjust DialogContent / TaskDetail layout so a top hero can be full-width and flush with dialog top radii (inner scroll as needed).
- [x] T005 Implement cover hero (reuse authenticated attachment content fetch). Show only when `cover` non-null; `max-h-36` / `object-cover` (Q-241); non-interactive / no click (Q-242).
- [x] T006 Wire cover set/clear (`applyCover` / existing controls) so hero appears, updates, and disappears without a second cover model (AC-003).
- [x] T007 Add/update frontend tests for AC-001–AC-005 as practical.

### Phase 4 — Verification

- [x] T008 Run targeted frontend tests; record commands and results.
- [x] T009 Run frontend typecheck and relevant full test suite on Node 22; record results.
- [x] T010 Verify AC-001–AC-006; confirm non-goals held.
- [x] T011 Obtain independent review and resolve blocking findings.
- [x] T012 Update `memory.md` from verified state. Propose catalog patch; **wait for user confirm** before `implemented-features.md`.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T002 | T001       | Approved status |
| T003 | T002       | N/A note |
| T004 | T002       | Layout review |
| T005 | T004       | Tests |
| T006 | T005       | Tests |
| T007 | T005, T006 | Test results |
| T008 | T007       | Command output |
| T009 | T008       | Command output |
| T010 | T009       | AC checklist |
| T011 | T010       | Reviewer verdict |
| T012 | T011       | memory.md |

## Acceptance coverage

| Criterion | Task(s)    | Evidence      |
| --------- | ---------- | ------------- |
| AC-001    | T004–T005, T007 | Tests |
| AC-002    | T005, T007 | Tests |
| AC-003    | T006, T007 | Tests |
| AC-004    | T005, T007 | Tests |
| AC-005    | T003, T010 | Review |
| AC-006    | T002       | Process |

## Completion report

- Completed tasks: T001–T012
- Inspection (T001): `TasksPanel` DialogContent; `TaskDetail` + `applyCover`; Kanban `KanbanCardCoverImage` / `fetchAttachmentContent`. Approach: DialogContent `p-0 overflow-hidden`; TaskDetail owns flush hero + padded scroll body.
- T002: artifacts Approved; Q-237–Q-242 Decided; 039 Verified before 040 impl.
- T003: no backend/Prisma/API changes (frontend-only over 017).
- Tests executed:
  - Targeted: `TaskDetail.test.tsx` — 35 passed; with KanbanBoard + TasksPanel earlier — 98 passed
  - Full frontend `npm test` — 35 files / 358 passed
  - `npm run typecheck` — exit 0
  - Node: shell reported `v24.22.1` (`nvm use 22.22.3` activated but PATH still preferred Cursor agent Node); suites green
- Actual results: all listed checks passed; no migrations; hero reuses 017 auth content fetch
- Known issues: none blocking; Low flush-shell test gap; Dialog Close may overlay hero; blob `src` revoked after unmount (brief); suite not re-run by reviewer
- Reviewer findings: PASS WITH NON-BLOCKING (Low: flush shell test gap; Dialog Close overlays hero; Info: suite not re-run; brief revoked blob src). Blocking: no. Failed ACs: none.
- Memory updated: yes (T012); catalog propose only (034–040; await confirm — do not edit `implemented-features.md`)
- Remaining work: none for 040 (catalog confirm deferred)
