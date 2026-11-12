# Tasks: Confirm Dialogs

- **Feature ID:** 035-confirm-dialogs
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. **Stop if artifacts are Draft.**

Locked: confirm soft-delete + logout via shadcn Dialog Cancel/Confirm; Q-213 copy (“Delete task?” / “Log out?”; Confirm “Delete” / “Log out”); no `window.confirm`. No notes/**C**/constitution/catalog edits.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect TaskDetail delete, LogoutButton, Dialog usage, and nested-Dialog risk. Record approach (shared ConfirmDialog vs inline). Do not change product code.
  - Evidence: `TaskDetail` `onDelete` was immediate; `LogoutButton` logout immediate; shadcn Dialog already nested (e.g. CreateChecklistDialog). Approach: shared `frontend/src/components/ConfirmDialog.tsx` (portal Dialog Cancel/Confirm) for both flows.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-211–Q-213 Decided. **Stop if artifacts are Draft.**
  - Evidence: All three Status: Approved; Q-211–Q-213 Decided.

### Phase 2 — Backend

- [x] T003 N/A — frontend-only. Record evidence.
  - Evidence: N/A — frontend-only; soft-delete/logout HTTP contracts unchanged.

### Phase 3 — Frontend

- [x] T004 Add soft-delete confirm Dialog (AC-001–AC-002 / Q-211).
  - Evidence: TaskDetail opens ConfirmDialog title “Delete task?”; Confirm “Delete”; Cancel closes without DELETE.
- [x] T005 Add logout confirm Dialog (AC-003–AC-004 / Q-212).
  - Evidence: LogoutButton opens ConfirmDialog title “Log out?”; Confirm “Log out”; Cancel closes without logout POST.
- [x] T006 Add/update frontend tests for cancel/confirm paths and no `window.confirm` (AC-005).
  - Evidence: TaskDetail + LogoutButton + TasksPanel + App logout paths updated; cancel/confirm covered; `window.confirm` spy unused; product grep has no `window.confirm`.

### Phase 4 — Verification

- [x] T007 Run targeted frontend tests; record results.
  - Command (Node 22.22.3): `npx vitest run src/auth/LogoutButton.test.tsx src/tasks/TaskDetail.test.tsx src/tasks/TasksPanel.test.tsx src/App.test.tsx` → 4 files / 81 passed.
- [x] T008 Run typecheck and relevant full suite on Node 22; record results.
  - Node 22.22.3: `npm run typecheck` exit 0; `npm test` → 35 files / 340 passed.
- [x] T009 Verify AC-001–AC-007; non-goals held.
  - AC-001: Delete task → Dialog → Confirm → soft-delete (TaskDetail test).
  - AC-002: Cancel → no DELETE (TaskDetail cancel test).
  - AC-003: Log out → Dialog → Confirm → logout (LogoutButton + App tests).
  - AC-004: Cancel → no logout (LogoutButton cancel test).
  - AC-005: no `window.confirm` in product code; spy asserts in confirm paths.
  - AC-006: frontend-only; no API/Prisma/constitution/`implemented-features` edits; other confirms out of scope.
  - AC-007: artifacts Approved; Q-211–Q-213 Decided; T001–T009 only (T010–T011 deferred).
- [x] T010 Independent review; resolve blockers.
  - Evidence: Reviewer PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none.
- [x] T011 Update `memory.md`; propose catalog patch; wait for confirm before `implemented-features.md`.
  - Evidence: `memory.md` records 035 Verified + Q-211–Q-213; catalog propose only (not edited).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection |
| T002 | T001 | Approved |
| T003 | T002 | N/A |
| T004 | T002 | Delete confirm |
| T005 | T002 | Logout confirm |
| T006 | T004, T005 | FE tests |
| T007 | T006 | Command log |
| T008 | T007 | Command log |
| T009 | T008 | AC checklist |
| T010 | T009 | Reviewer |
| T011 | T010 | Memory |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T006, T009 | Confirm delete |
| AC-002 | T004, T006, T009 | Cancel delete |
| AC-003 | T005, T006, T009 | Confirm logout |
| AC-004 | T005, T006, T009 | Cancel logout |
| AC-005 | T006, T009 | No window.confirm |
| AC-006 | T003, T009 | Scope |
| AC-007 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T011
- Tests executed: Node 22.22.3 — targeted LogoutButton/TaskDetail/TasksPanel/App → 4 files / 81 passed; `npm run typecheck` exit 0; full `npm test` → 35 files / 340 passed
- Actual results: Shared ConfirmDialog gates soft-delete and logout; Q-213 copy; no `window.confirm`; no schema/API
- Known issues: nested TaskDetail+confirm Dialog (same pattern as CreateChecklistDialog); non-blocking reviewer findings only
- Reviewer findings: PASS WITH NON-BLOCKING; Blocking: no; Failed ACs: none
- Memory updated: yes (T011); catalog propose only (await confirm)
- Remaining work: none for 035
