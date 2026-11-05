# Tasks: Task Checklists

- **Feature ID:** 015-task-checklists
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Spec section 15: **Q-105**, **Q-106**, **Q-110–Q-124** are **Decided**; **Q-109** is **SUPERSEDED** by **Q-109b** (emit four checklist activity kinds). Do not reopen Decided answers unless a constitution conflict. This feature is **checklists only** (proposed ID **F**). Do not implement attachments (**G**), item assign, item due date, hide-checked, Markdown description redesign, or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Keep Verified comments and labels public HTTP contracts intact; extend activity kinds additively per Q-109b/Q-124. Checklist mutations MUST emit the four kinds in the same transaction as writes (fail write if activity insert fails). Additive migration only. Locked: one or more named checklists per task; items text + checked; TaskDetail only (not Kanban columns; not child tasks); nested REST (Q-117); no PublicTaskDto/Kanban embed (Q-115); hard-delete cascade (Q-112); createdAt order only (Q-113); action-row Checklist + main-column lists (Q-118); progress bar (Q-122); mark-not-hide (Q-123); render new kinds in Comments & activity (Q-124).

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `TasksService`, `TaskAuthorizationPort`, comments/labels/activity routes and emission/UoW patterns (011 Q-077), Prisma `Task` / `TaskActivityKind` and latest migrations, frontend `TaskDetail` two-column layout / action row / LabelsPopover / `CommentsActivityPanel` (omit `COMMENT_ADDED`), API client activity parsers. Record files to extend. Do not change code in this task. Do not specify attachments beyond deferred non-goals already in the spec.
  - Evidence: inspected `comments-service`/`labels-service`/`task-activity`/`TaskAuthorizationPort`/`schema.prisma`/`app.ts`/`main.ts`; extend points under `backend/src/modules/tasks/` + additive Prisma migration (frontend T010+ deferred).
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-105/Q-106/Q-109b and Q-110–Q-124 Decided (plan API/persistence/UI/activity already aligned; Q-109 superseded). Confirm no **G**/**C**/assign/due/hide-checked/Markdown-redesign implementation; no audit ID `005`; additive migration only; comments/labels contracts intact; activity additive kinds only. **Stop if artifacts are Draft (not Approved).**
  - Evidence: all three artifacts Status **Approved**; Decided Qs locked; backend T001–T009 only this batch.

### Phase 2 — Backend

- [x] T003 Implement domain behavior for checklists and items per Decided Q-105/Q-106/Q-109b and Q-110–Q-124: identity; name required 1–80 trim (no server default); item text 1–200 trim; checked default false / no checked on create; hard-delete cascade (checklist→items) and hard-delete item; no soft-delete columns; list order `createdAt` ascending; empty checklists allowed; not child tasks. Extend activity domain with kinds `CHECKLIST_ADDED`, `CHECKLIST_REMOVED`, `CHECKLIST_ITEM_COMPLETED`, `CHECKLIST_ITEM_UNCOMPLETED` and payload builders (ids + name/text previews, truncate like `COMMENT_ADDED`). Unit-test without HTTP/Prisma.
  - Evidence: `task-checklist.ts` + activity kinds/payloads; `task-checklist.domain.test.ts` passed.
- [x] T004 Implement domain-specific repository contracts + in-memory fakes for checklists and items (list-by-task with nested items ordered by `createdAt` asc; delete cascade behavior; snapshots needed for remove preview). Ensure activity create remains available inside the shared unit-of-work fake used by 011.
  - Evidence: `checklists-repository.ts` + `in-memory-checklists-repository.ts`; in-memory repo tests passed.
- [x] T005 Add Prisma checklist + item models and **additive** `TaskActivityKind` enum values in a **versioned additive** migration under `backend/prisma/`. Do not drop unrelated columns. Do not add attachment/cover/audit-app-wide tables. Do not add `position`/`rank` or soft-delete columns. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement Prisma repository adapters.
  - Evidence: migration `20261105140000_task_checklists` applied via `prisma migrate deploy`; `PrismaChecklistsRepository` + prisma adapter test passed.
- [x] T006 Implement service use cases: checklist create/list/update/delete; item create/update/delete; authz via Q-110 (`requireTaskWrite` / `requireTaskRead`); archived per Q-111 (`ownerUserId` → 409; other members → 403); soft-deleted task `404`. Emit activity in the same transaction for create checklist (`CHECKLIST_ADDED`), delete checklist (`CHECKLIST_REMOVED` only), and checked toggles (`CHECKLIST_ITEM_COMPLETED` / `CHECKLIST_ITEM_UNCOMPLETED`). Do **not** emit for item add/delete, checklist rename, text-only item PATCH, or no-op checked. Fail the write if activity insert fails (011 Q-077 / Q-124). Do not change comments/labels public contracts. Do not embed checklists on task DTOs.
  - Evidence: `checklists-service.ts`; `checklists-service.test.ts` passed (authz/archived/emission/fail-write).
- [x] T007 Implement DTOs and Zod validators for checklist/item bodies and params per Q-114/Q-116/Q-117/Q-119/Q-121 (required name; create item `{ text }` only; PATCH name; PATCH item `text` and/or `checked`). Reject unknown fields including `checked` on create. Extend activity public DTO/parsers for the four new kinds.
  - Evidence: `checklist-dtos.ts` + validators; activity domain parsers extended (DTO union via `ActivityView` kinds); validation covered in API tests.
- [x] T008 Implement controller and routes per Q-117 nested REST; wire composition root. Do not change comments or labels route contracts. Do not change activity list path/envelope beyond additive kinds. Do not add attachment or reorder routes.
  - Evidence: `checklists-controller.ts` / `checklists-routes.ts`; wired in `app.ts` + `main.ts`; comments/labels regression suites passed.
- [x] T009 Add unit/service/API SuperTest coverage for AC-001–AC-007 and AC-009–AC-014 (authz, validation, delete cascade, createdAt order, archived, soft-delete, empty checklists, emission matrix + same-tx fail-write, comments/labels non-regression, no PublicTaskDto checklist fields).
  - Evidence: `checklists-api.test.ts` + related unit/service/prisma tests; 6 checklist suites 35 passed; comments/activity/labels + error-handler 35 passed; `npm run typecheck` passed.

### Phase 3 — Frontend

- [x] T010 Implement API client helpers (list/create/patch/delete checklists; create/patch/delete items) with `credentials: 'include'`. Add shared checklist types. Extend activity client types/parsers for the four new kinds. Do not embed checklist fields into Kanban list mapping (Q-115).
  - Evidence: `frontend/src/api/types.ts` + `client.ts` checklist helpers/parsers; `client.test.ts` checklists + four activity kinds with credentials; Kanban mapping untouched.
- [x] T011 Implement UI in `TaskDetail` per Q-118/Q-122/Q-123: action-row Checklist control + main-column checklists/items below labels/fields; per-checklist progress bar (checked/total percentage; empty → 0%); checked items visible with strikethrough/completed styling; **no** hide-checked control; VIEWER read-only; writers mutate when allowed; archived disablement; allow empty lists; no drag reorder; reload activity after emitting mutations. Cover loading/empty/success/error/401/403/404/409 as applicable. Do not redesign Members Dialog, dashboard, Kanban DnD, comments composer, or labels beyond action-row neighbor. Do not implement attachments, item assign, item due date, or Markdown description redesign. Do not add Dates/Attachment placeholders.
  - Evidence: `TaskChecklistsPanel.tsx` + `TaskDetail.tsx` action-row/main-column; TaskDetail tests cover progress/strikethrough/VIEWER/create+activity reload; no Dates/Attachment/assign/due/hide.
- [x] T012 Update `CommentsActivityPanel` / timeline builder to **render** the four checklist kinds with name/text previews (Q-124); continue omitting `COMMENT_ADDED`. Add frontend tests for AC-008 / AC-015 (and related): credentials, Checklist control + main-column section, progress bar, strikethrough / no hide control, checked toggle chrome, timeline checklist kinds visible, VIEWER read-only, no Dates/Attachment/assign/due placeholders, no attachment UI, no Kanban checklist progress, existing Labels/Comments still present.
  - Evidence: `CommentsActivityPanel.tsx` renders four kinds; panel + TaskDetail + KanbanBoard tests; targeted vitest 98 passed; `npm run typecheck` passed.

### Phase 4 — Verification

- [x] T013 Run targeted backend and frontend tests; record commands and actual results.
  - Evidence (Node v22.22.3 via nvm): backend `npm test --` checklist domain/repo/service/api + comments/labels/activity → 8 files, **53 passed**; frontend `npm test --` client/TaskDetail/CommentsActivityPanel/TaskChecklistsPanel/KanbanBoard → 5 files, **98 passed**.
- [x] T014 Run type checking and relevant quality checks; record commands and actual results.
  - Evidence (Node v22.22.3): backend `npm run typecheck` exit 0; backend `npm run build` exit 0; frontend `npm run typecheck` exit 0; frontend `npm run build` exit 0 (vite chunk-size warning only, non-blocking).
- [x] T015 Verify acceptance criteria AC-001–AC-015 against the spec using Decided Q-105/Q-106/Q-109b and Q-110–Q-124. Record any unmet criterion. Confirm no **G**/**C**/assign/due/hide-checked/Markdown-redesign implementation, no `specs/005-audit/`, comments/labels contracts intact, activity additive kinds only with correct emission matrix, `constitution.md` unchanged.
  - Evidence: AC-001–AC-015 **all pass** (see Acceptance coverage). Scope: no `specs/005-audit/`; no peer `checklists`/`attachments` modules; migration `20261105140000_task_checklists` additive only (four kinds + tables; no attachment/position/rank/soft-delete); `PublicTaskDto` has no checklist fields; checklist routes nested under tasks only; `constitution.md` unmodified (`git status`/`diff` clean); UI asserts no hide-checked / item-assign / Attachment placeholders; activity kinds additive with fail-write covered.
- [x] T016 Obtain independent review and resolve blocking findings.
  - Evidence: Independent reviewer **Pass with notes**. Blocking: no. Failed ACs: none. Non-blocking: SuperTest uses ImmediateUnitOfWork (same-tx fail-write covered in service SnapshotUnitOfWork); UNCOMPLETED emission asserted in service not API; reviewer did not re-run live tests.
- [x] T017 Update `memory.md` (and only docs that changed) from verified state. Record answered open questions Q-109b and Q-110–Q-124 (note Q-109 superseded). Keep deferred **G** and later **C** visible. Keep Q-006/007/009/015/017 deferred. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Do not mark tasks complete without evidence.
  - Evidence: `memory.md` updated; catalog patch proposed to user (not applied until confirm).

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Q-109b / Q-110–Q-124 already Decided |
| T003 | T002 | Domain unit tests |
| T004 | T003 | In-memory repo tests |
| T005 | T004 | Migration apply + adapter tests |
| T006 | T005 | Service tests (incl. emission / fail-write) |
| T007 | T006 | Validator / activity DTO tests |
| T008 | T007 | Routes wired |
| T009 | T008 | SuperTest / service results |
| T010 | T009 | Client tests |
| T011 | T010 | UI automated tests |
| T012 | T011 | Frontend test results (panel + AC-008) |
| T013 | T012 | Command log |
| T014 | T013 | Command log |
| T015 | T014 | AC checklist |
| T016 | T015 | Reviewer verdict |
| T017 | T016 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T006, T009, T015 | PASS — create named + list + CHECKLIST_ADDED (api/service) |
| AC-002 | T003, T006, T009, T015 | PASS — multiple checklists + createdAt order + two ADDED events |
| AC-003 | T003, T006, T009, T015 | PASS — item create no emit; checked toggle COMPLETED/UNCOMPLETED; reject checked on create |
| AC-004 | T006, T009, T011, T015 | PASS — VIEWER list OK / mutate 403; UI read-only |
| AC-005 | T006, T009, T015 | PASS — 401 / 403 non-member / 404 soft-delete+missing |
| AC-006 | T003, T006, T009, T015 | PASS — four kinds + non-emit matrix + fail-write rolls back |
| AC-007 | T008, T009, T015 | PASS — comments/labels + activity suites in targeted run; PublicTaskDto unchanged |
| AC-008 | T011, T012, T015 | PASS — Checklist control, progress/strikethrough, timeline kinds, no Kanban progress |
| AC-009 | T005, T006, T009, T015 | PASS — hard-delete cascade + CHECKLIST_REMOVED only; item delete no emit |
| AC-010 | T003, T006, T009, T015 | PASS — createdAt asc; no reorder routes/position/rank |
| AC-011 | T007, T009, T015 | PASS — validation 400 VALIDATION_ERROR |
| AC-012 | T006, T009, T015 | PASS — archived owner 409 / member 403; soft-delete 404 |
| AC-013 | T005, T015 | PASS — additive migration `20261105140000_task_checklists`; no attachment tables |
| AC-014 | T003–T009, T015 | PASS — under `modules/tasks`; TaskAuthorizationPort; no peer domain; no `specs/005-audit/` |
| AC-015 | T011, T012, T015 | PASS — no G/assign/due/hide UI; constitution unmodified |

## Completion report

- Completed tasks: T001–T017
- Tests executed: backend targeted 8 files / 53 passed; frontend targeted 5 files / 98 passed; backend+frontend typecheck; backend+frontend build (Node v22.22.3)
- Actual results: all listed commands exited 0; AC-001–AC-015 PASS
- Known issues: none unmet; Cursor shell PATH may prefer agent Node v24 unless nvm symlink is prepended; reviewer non-blocking notes on SuperTest UoW / UNCOMPLETED API assert
- Reviewer findings: Pass with notes; blocking no; failed ACs none
- Memory updated: yes (T017); `implemented-features.md` patch proposed, awaiting user confirm
- Remaining work: none for 015 (catalog apply after user confirm; **G** deferred)
