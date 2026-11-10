# Tasks: Cover Pointer Cursor

- **Feature ID:** 030-cover-pointer
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Spec **Q-196** Decided (locked). Plan/tasks aligned. Frontend-only. No Prisma/API. No task notes / **C**. **H** owned by `031`. Do not change `constitution.md`. Do not edit `implemented-features.md` until later user confirm.

Locked: `cursor-pointer` on Create + Edit project cover upload/file pickers.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect CreateProjectDialog and EditProjectDialog cover file controls and related tests. Record files to change. Confirm no schema/API need. Do not change product code in this task.
  - Evidence: Cover `Input type="file"` in Create (`aria-label` Optional project cover) and Edit (`aria-label` Upload project cover); Clear cover Button already pointer via 019. Files: `CreateProjectDialog.tsx`, `EditProjectDialog.tsx`, `ProjectsPage.test.tsx`, `EditProjectDialog.test.tsx`. No schema/API.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-196 Decided. Confirm non-goals. **Stop if artifacts are Draft.**
  - Evidence: All three artifacts Status Approved; Q-196 Decided; non-goals held (no notes/**H**/**C**/constitution/catalog).

### Phase 2 — Backend

- [x] T003 Not applicable — no domain/API/Prisma changes planned. Record “N/A — frontend-only” as evidence when Approved work starts. If a contract gap appears, **stop** and amend artifacts.
  - Evidence: N/A — frontend-only.

### Phase 3 — Frontend

- [x] T004 Apply pointer cursor classes to Create Project Dialog cover file picker (AC-001 / Q-196).
  - Evidence: `CreateProjectDialog` cover Input `className` includes `cursor-pointer file:cursor-pointer`.
- [x] T005 Apply pointer cursor classes to Edit Project Dialog cover upload file picker (and related cover pickers on that surface) (AC-002 / Q-196).
  - Evidence: `EditProjectDialog` cover Input same classes; Clear cover Button unchanged (already pointer).
- [x] T006 Add/update frontend tests for AC-001–AC-004 as practical.
  - Evidence: ProjectsPage create cover asserts pointer classes + disabled while creating; EditProjectDialog asserts pointer classes + disabled while saving.

### Phase 4 — Verification

- [x] T007 Run targeted frontend tests; record commands and actual results.
  - Evidence: Node v22.22.3; `npm test -- --run src/projects/ProjectsPage.test.tsx src/projects/EditProjectDialog.test.tsx` → 2 files / 18 passed.
- [x] T008 Run frontend `npm run typecheck` and relevant `npm test` on Node 22; record results.
  - Evidence: Node v22.22.3; `npm run typecheck` exit 0; `npm test -- --run` → 34 files / 330 passed.
- [x] T009 Verify AC-001–AC-005 against the spec. Confirm no migration, constitution unchanged, non-goals held.
  - Evidence: AC-001–AC-003 covered by Create/Edit class + disabled asserts; AC-004 no Prisma/API/constitution drift; AC-005 Approved gate held. Notes/**H**/**C**/catalog out of scope.
- [x] T010 Obtain independent review and resolve blocking findings.
  - Evidence: Independent review **PASS WITH NON-BLOCKING FINDINGS** (Pass with notes). Blocking: no. Failed ACs: none. AC-001–AC-005 verified. Informational: reviewer did not re-run FE suite/typecheck (Ask/readonly); evidence static code + test asserts (implementer: 18 targeted / 330 full / typecheck 0). Q-196 met: Create+Edit cover file inputs only; no global Input; Clear cover left to 019 Button.
- [x] T011 Update `memory.md` from verified state. Record Q-196. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file.
  - Evidence: `memory.md` updated (Verified 030; Q-196; next approved work none). Catalog patch proposed in implementer return — `implemented-features.md` not edited.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-196 Decided |
| T003 | T002 | N/A evidence |
| T004 | T002 | Create picker cursor |
| T005 | T002 | Edit picker cursor |
| T006 | T004, T005 | Frontend test results |
| T007 | T006 | Command log |
| T008 | T007 | Command log |
| T009 | T008 | AC checklist |
| T010 | T009 | Reviewer verdict |
| T011 | T010 | Memory updated; catalog only after confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T004, T006, T009 | Create cover pointer — ProjectsPage test |
| AC-002 | T005, T006, T009 | Edit cover pointer — EditProjectDialog test |
| AC-003 | T004–T005, T009 | Disabled path — creating/saving asserts |
| AC-004 | T003, T009 | No API/schema — N/A frontend-only |
| AC-005 | T002 | Approval gate |

## Completion report

- Completed tasks: T001–T011
- Tests executed (Node 22.22.3): targeted ProjectsPage + EditProjectDialog → 18 passed; `npm run typecheck` exit 0; full `npm test` → 34 files / 330 passed
- Actual results: Create/Edit cover file inputs use `cursor-pointer file:cursor-pointer`; disabled during busy; no Prisma/API; constitution untouched
- Known issues: none blocking. Informational: reviewer did not re-run suites. Catalog awaiting user confirm.
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (T011); catalog propose only — **do not** edit `implemented-features.md` until user confirms
- Remaining work: none Approved queued; user confirm catalog patch for 019–030 (and 031) if not yet applied
