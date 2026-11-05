# Tasks: Task Detail Layout

- **Feature ID:** 013-task-detail-layout
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Decided Q-094–Q-101. Frontend-focused. No backend/Prisma work expected. Do not implement checklists (**F**), attachments, assignees, or fake Dates/Checklist/Attachment actions. Do not change `constitution.md`. Add documented `@radix-ui/react-popover` + copied shadcn `popover` (Q-101 Option 2). Keep Verified comments/activity/labels HTTP contracts intact.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing TaskDetail, TasksPanel Dialog host, LabelsDialog, LabelChips, comment/activity sections, and related tests/client helpers. Record files to change and Dialog-focus constraints for Radix Popover inside Dialog. Do not change product code in this task. Confirm no schema need.
  - Evidence: Inspected `TaskDetail.tsx` (nested Card + Save labels + separate Comments/Activity), `TasksPanel.tsx` Dialog (`max-w-lg`), `LabelsDialog.tsx` (board header via `ProjectDetail`), `LabelChips.tsx`, client helpers for comments/activity/labels. Change set: TaskDetail, TasksPanel DialogContent width, new `popover.tsx` + `LabelsPopover` + `CommentsActivityPanel`, tests. Focus: modal Popover inside Dialog; Escape on PopoverContent `stopPropagation` + discard mode; outside/Done apply. No schema need.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-094–Q-101 Decided with recorded options (including Q-099 Escape discard, Q-100 omit `COMMENT_ADDED`, Q-101 Popover peer). Confirm non-goals (**F**, no migration, no constitution edit, Labels-only action row, apply-on-close for non-Escape dismiss). **Stop if artifacts are Draft.**
  - Evidence: All three artifacts Status **Approved**; Q-094–Q-101 Decided as recorded in `spec.md` §15.

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only; contracts reused” as evidence when Approved work starts. If a contract gap is discovered, stop and amend artifacts instead of inventing API changes.
  - Evidence: N/A — frontend-only; contracts reused. No backend/Prisma edits.

### Phase 3 — Frontend

- [x] T004 Flatten TaskDetail Dialog chrome (reduce nested Card saturation) and implement responsive shell: two columns from `md+`, stack main then side below `md` (Q-098). Keep existing task field editors / save / delete in the main column for writers. Adjust `TasksPanel` `DialogContent` width/scroll as needed.
  - Evidence: Removed nested Card wrappers; `task-detail-layout` uses `grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]`; `TasksPanel` DialogContent `max-w-4xl`.
- [x] T005 Add `@radix-ui/react-popover` and copied shadcn `popover` primitive (Q-101). Implement Labels action row (**Labels only**, Q-097) and Labels Popover with search, optimistic checkboxes, edit affordance, and create-new for writers; read-only catalog for non-writers (Q-095). On outside click / Done/close, apply `replaceTaskLabels` when selection changed (Q-094, Q-099). On Escape, discard uncommitted toggles without PUT (Q-099). Remove TaskDetail “Save labels” button. Keep board-header `LabelsDialog`.
  - Evidence: `@radix-ui/react-popover` in `frontend/package.json`; `components/ui/popover.tsx`; `LabelsPopover.tsx`; Save labels removed; `LabelsDialog` still wired in `ProjectDetail`.
- [x] T006 Implement right panel “Comments & activity”: compose on top; interleaved newest-first timeline of live comments + activity excluding `COMMENT_ADDED` (Q-096, Q-100); preserve Verified comment edit/delete authz and activity read-only rendering; preserve loading/error/empty handling for both sources.
  - Evidence: `CommentsActivityPanel.tsx` + `buildCommentsActivityTimeline` omits `COMMENT_ADDED`; compose top; authz/edit/delete preserved.
- [x] T007 Add/update frontend tests for AC-001–AC-012 as applicable (layout regions, Labels-only row, chips, optimistic toggles, apply-close PUT, Escape discard, catalog surfaces, interleaved order without `COMMENT_ADDED`, VIEWER/archived disablement, no checklist/attachment placeholders, credentials unchanged). Extract components only if needed for testability.
  - Evidence: Updated `TaskDetail.test.tsx`; added `LabelsPopover.test.tsx`, `CommentsActivityPanel.test.tsx`. Node 22: `npm run typecheck` pass; `npm test -- src/tasks/` → 6 files, 64 tests passed.
### Phase 4 — Verification

- [x] T008 Run targeted frontend tests for TaskDetail / Labels / TasksPanel (and any new files); record commands and actual results.
  - Evidence: Node 22.22.3; `npm test -- src/tasks/TaskDetail.test.tsx src/tasks/LabelsPopover.test.tsx src/tasks/CommentsActivityPanel.test.tsx src/tasks/LabelsDialog.test.tsx src/tasks/TasksPanel.test.tsx` → 5 files, 53 tests passed (6.38s).
- [x] T009 Run frontend `npm run typecheck` and full frontend `npm test` on Node 22; record commands and actual results. Backend suites optional smoke only if any shared client type was touched (not expected).
  - Evidence: Node 22.22.3; `npm run typecheck` pass; first full `npm test` failed 1/210 (`frontend-deps.test.ts` missing Q-101 `popover` allowlist); updated allowlist for `@radix-ui/react-popover` + `popover.tsx`; re-run `npm run typecheck` pass; `npm test` → 22 files, 210 tests passed (8.57s). Backend smoke N/A (no shared client type changes).
- [x] T010 Verify AC-001–AC-012 against the spec using Decided Q-094–Q-101. Confirm no **F** UI, no Prisma migration, no constitution change, LabelsDialog still present, Popover peer present, contracts unchanged.
  - Evidence: AC-001/002 layout grid + regions in tests/DOM; AC-003 Labels-only (no Dates/Checklist/Attachment); AC-004 chips; AC-005–007 popover search/edit/create, optimistic, Done PUT, Escape discard; AC-008 LabelsPopover + `ProjectDetail` LabelsDialog; AC-009 Comments & activity omits `COMMENT_ADDED`; AC-010 no **F** UI, no 013 Prisma migration, `constitution.md` unchanged, HTTP contracts reused; AC-011 no nested Card in TaskDetail; AC-012 VIEWER/archived/401/403/409 covered in TaskDetail tests. Popover peer `@radix-ui/react-popover` + `components/ui/popover.tsx` present.
- [x] T011 Obtain independent review and resolve blocking findings.
  - Independent reviewer: **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. AC-001–AC-012 verified. Non-blocking: LabelsPopover catalog edit path lightly tested; Escape/Dialog nesting unit-only; display title above layout grid. Scope: frontend-only; no F; LabelsDialog kept; popover peer present.
- [x] T012 Update `memory.md` from verified state. Record Q-094–Q-101 answers (including Popover peer). Keep deferred **F** and later **C** visible. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - `memory.md` updated to Verified for `013-task-detail-layout`. Catalog patches for 012+013 proposed; `implemented-features.md` not edited pending user confirmation.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-094–Q-101 Decided |
| T003 | T002 | N/A evidence note |
| T004 | T002 | Layout tests / inspection |
| T005 | T004 | Popover + apply-close / Escape-discard tests |
| T006 | T004 | Timeline tests (omit `COMMENT_ADDED`) |
| T007 | T005, T006 | Frontend test results |
| T008 | T007 | Command log |
| T009 | T008 | Command log |
| T010 | T009 | AC checklist |
| T011 | T010 | Reviewer verdict |
| T012 | T011 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T007, T010 | Two-column md+ |
| AC-002 | T004, T007, T010 | Stacked below md |
| AC-003 | T005, T007, T010 | Labels-only action row |
| AC-004 | T004, T007, T010 | Main chips |
| AC-005 | T005, T007, T010 | Popover contents |
| AC-006 | T005, T007, T010 | Apply-close PUT; Escape discard |
| AC-007 | T005, T007, T010 | Optimistic toggles |
| AC-008 | T005, T007, T010 | Popover + LabelsDialog |
| AC-009 | T006, T007, T010 | Comments & activity; omit `COMMENT_ADDED` |
| AC-010 | T003, T010, T011 | Non-goals / contracts |
| AC-011 | T004, T010 | Reduced Card nesting |
| AC-012 | T005, T006, T007, T010 | Authz/archived |

## Completion report

- Completed tasks: T001–T012
- Tests executed (T008–T011 close-out, Node v22.22.3): frontend typecheck; frontend `npm test`
- Actual results (coordinator): frontend typecheck exit 0; frontend 22 files / 210 tests passed. AC-001–AC-012 met; unmet: none.
- Known issues: LabelsPopover catalog edit lightly tested; Escape discard unit-tested not in live Dialog host
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (`memory.md`); catalog patches for 012+013 proposed, awaiting user confirmation
- Remaining work: none for 013; deferred next product work is **F** (checklists)
