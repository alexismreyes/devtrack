# Tasks: Task Labels

- **Feature ID:** 012-task-labels
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Verified**. Q-080–Q-093 in `spec.md` section 15 are **Decided** (option **1** each). Do not reopen Decided answers unless a constitution conflict. This feature is **labels only** (proposed ID **E**). Do not implement checklists (**F**) or app-wide audit (**C**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Keep Verified comments and activity public HTTP contracts intact; no label activity events (Q-089). Additive migration only. Locked: per-project catalog; many labels per task; card face; filter. Color tokens: `RED` | `ORANGE` | `YELLOW` | `GREEN` | `TEAL` | `BLUE` | `PURPLE` | `PINK` | `GRAY`.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `TasksService`, `TaskAuthorizationPort`, task routes/DTOs/list query (`status`/`priority`), Prisma `Task`/`Project`/`ProjectMember`, frontend `TasksPanel` filters, `KanbanBoard` card face, `TaskDetail`, board-header Members Dialog pattern, comments/activity routes for contract non-regression. Record files to extend. Do not change code in this task. Do not specify checklists or audit beyond deferred notes already in the spec.
  - Evidence: Extended `backend/src/modules/tasks/` (mirror comments/activity), `TaskAuthorizationPort`, `PublicTaskDto`/`list-tasks-query`, Prisma `Project`/`Task`, `app.ts`/`main.ts`; frontend deferred to T010+.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-080–Q-093 are **Decided** and recorded (option 1 each). Confirm no **F**/**C** implementation; no audit ID `005`; additive migration only; comments contracts intact; activity contracts intact with no label events; Decided E constraints (per-project catalog, many labels per task, card face, filter). **Stop if artifacts are Draft.**
  - Evidence: All three artifacts Status Approved; Q-080–Q-093 Decided option 1; no F/C/005/constitution work.

### Phase 2 — Backend

- [x] T003 Implement domain behavior for project labels and task assignments per Decided Q-080–Q-093 (identity; name 1–40 after trim; case-insensitive uniqueness; fixed color token set from plan; same-project assignment; `PUT` replace-set; hard-delete + join cleanup; no count caps). Unit-test without HTTP/Prisma.
  - Evidence: `project-label.ts` + `project-label.domain.test.ts` passed.
- [x] T004 Implement domain-specific repository contracts + in-memory fakes for catalog and assignments (including batch load for task list embedding and delete-by-label join cleanup).
  - Evidence: `labels-repository.ts`, `task-labels-repository.ts`, in-memory fakes + `in-memory-labels-repository.test.ts` passed.
- [x] T005 Add Prisma label + join models (`name` + `nameKey`, Cascade join on label delete) and a **versioned additive** migration under `backend/prisma/`. Do not drop unrelated columns. Do not add checklist/audit-app-wide tables. `prisma migrate deploy` only. Do not `migrate reset` or delete volumes. Implement Prisma repository adapters; extend task list filter for optional single `labelId` AND with status/priority.
  - Evidence: Migration `20261105120000_task_labels` applied via `prisma migrate deploy`; Prisma adapters + `labelId` filter; `prisma-labels-repository.test.ts` passed with DATABASE_URL.
- [x] T006 Implement service use cases: catalog create/list/update/delete; assignment replace-set; task responses include `labels: [{ id, name, color }]`; list filter composition; authz via `requireTaskWrite` for catalog mutate + assignment and `requireTaskRead` for reads; archived `ownerUserId` → 409 / other members → 403 with reads allowed. Do not write activity events for labels.
  - Evidence: `labels-service.ts` + TasksService label embedding; `labels-service.test.ts` passed.
- [x] T007 Implement DTOs and Zod validators for catalog bodies/params (name, color enum), assignment body `{ labelIds }`, and extended list-tasks query (`labelId`). Reject unknown fields.
  - Evidence: `label-dtos.ts`, create/update/replace/label-params validators; list-tasks query includes `labelId`; covered by API validation cases.
- [x] T008 Implement controller and routes: `/api/projects/:projectId/labels` CRUD + `PUT /api/tasks/:taskId/labels`; wire composition root. Do not change comments or activity route contracts.
  - Evidence: `labels-controller.ts`, `labels-routes.ts`, `app.ts`/`main.ts` wired; comments/activity routes unchanged.
- [x] T009 Add unit/service/API SuperTest coverage for AC-001–AC-009 and AC-011–AC-015 (authz, validation, filter, delete, cross-project rejection, soft-delete/archived, task DTO `labels`, comments/activity non-regression as applicable).
  - Evidence: `labels-api.test.ts` + related suites; full backend `npm test` → 40 files / 315+ tests passed (Node 22 via nvm).

### Phase 3 — Frontend

- [x] T010 Implement API client helpers (catalog CRUD, assignment replace-set, listTasks `labelId`) with `credentials: 'include'`. Extend shared task types for `labels`.
  - Evidence: `frontend/src/api/types.ts` + `client.ts` label helpers/PUT; client tests for catalog CRUD, replace-set, `labelId` filter, embedded `labels`.
- [x] T011 Implement UI: Kanban card-face labels; board label filter; TaskDetail assignment for writers; board-header Labels Dialog for catalog CRUD. Cover loading/empty/success/error/401/403/404/409 as applicable. Do not redesign Members Dialog, dashboard, Kanban DnD, comments, or activity beyond label additions. Do not implement checklists.
  - Evidence: `LabelChips`, `LabelsDialog`, Kanban card face, TasksPanel label filter, TaskDetail assignment, ProjectDetail board-header Labels button; Members Dialog unchanged.
- [x] T012 Add frontend tests for AC-004/AC-005/AC-010 (and related): credentials, card face, filter query, TaskDetail assign chrome, Labels Dialog, no checklists/Trello branding requirement, existing Dialog still present.
  - Evidence: LabelsDialog/Kanban/TasksPanel/TaskDetail/ProjectDetail/client tests; `nvm use 22 && npm test` → 20 files / 205 passed; `npm run typecheck` clean.

### Phase 4 — Verification

- [x] T013 Run targeted backend and frontend tests; record commands and actual results.
  - Evidence (Node 22.22.3 via nvm path): backend `npm test --` label suites → 5 files / 29 passed; frontend `npm test --` LabelsDialog/client/Kanban/TasksPanel/TaskDetail/ProjectDetail → 5 files / 110 passed.
- [x] T014 Run type checking and relevant quality checks; record commands and actual results.
  - Evidence (Node 22.22.3): backend `npm run typecheck` clean; backend `npm test` → 41 files / 316 passed; frontend `npm run typecheck` clean; frontend `npm test` → 20 files / 205 passed.
- [x] T015 Verify acceptance criteria AC-001–AC-015 against the spec using Decided Q-080–Q-093. Record any unmet criterion. Confirm no **F**/**C** implementation, no `specs/005-audit/`, comments contracts intact, no label activity events.
  - Evidence: AC-001–AC-015 met (API suites + frontend tests + additive migration `20261105120000_task_labels` CREATE-only). No F/C code; no `specs/005-audit/`; comments `/api/tasks/:taskId/comments` and activity `/api/tasks/:taskId/activity` unchanged; `labels-service` has no activity dependency; AC-009 API asserts no label activity emission. Unmet: none.
- [x] T016 Obtain independent review and resolve blocking findings.
  - Independent reviewer: **PASS WITH NON-BLOCKING FINDINGS**. Blocking: no. AC-001–AC-015 verified. Non-blocking: suite not re-run in Ask-mode reviewer; AC-006 list 401/403 relies on existing task-list auth; AC-013 soft-deleted GET covered in tasks-api rather than labels suite. Scope: no F/C/audit; no label activity events.
- [x] T017 Update `memory.md` (and only docs that changed) from verified state. Record answered open questions Q-080–Q-093. Keep deferred **F** and later **C** visible. Keep Q-006/007/009/015/017 deferred. Propose any `implemented-features.md` catalog patch and **wait for explicit user confirmation** before editing that file. Do not mark tasks complete without evidence.
  - `memory.md` updated to Verified for `012-task-labels`. Catalog patch proposed; `implemented-features.md` not edited pending user confirmation.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | — | Inspection notes |
| T002 | T001 | Artifacts Approved; Qs Decided |
| T003 | T002 | Domain unit tests |
| T004 | T003 | In-memory repo tests |
| T005 | T004 | Migration apply + adapter tests |
| T006 | T005 | Service tests |
| T007 | T006 | Validator tests |
| T008 | T007 | Routes wired |
| T009 | T008 | SuperTest / service results |
| T010 | T009 | Client tests |
| T011 | T010 | UI manual/automated |
| T012 | T011 | Frontend test results |
| T013 | T012 | Command log |
| T014 | T013 | Command log |
| T015 | T014 | AC checklist |
| T016 | T015 | Reviewer verdict |
| T017 | T016 | Memory updated; catalog patch only after user confirm |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T003, T006, T009 | labels-api/service create+list |
| AC-002 | T003, T006, T009 | replace-set + task DTO labels |
| AC-003 | T006, T009 | cross-project 404 |
| AC-004 | T011, T012, T015 | KanbanBoard card-face label chips tests |
| AC-005 | T005, T006, T009, T011, T012, T015 | labelId API + TasksPanel filter tests |
| AC-006 | T006, T009 | 401/403 matrix |
| AC-007 | T006, T009, T011 | VIEWER read vs write API + UI |
| AC-008 | T005, T006, T009 | hard-delete + join cleanup |
| AC-009 | T008, T009, T015 | no label activity; comments/activity smoke |
| AC-010 | T011, T012, T015 | Labels Dialog, filter, assign, credentials |
| AC-011 | T007, T009 | Zod + 409 name collision |
| AC-012 | T006, T009 | archived 409/403 |
| AC-013 | T006, T009 | soft-deleted task 404 |
| AC-014 | T005, T015 | `20261105120000_task_labels` additive CREATE-only |
| AC-015 | T003–T009, T015 | tasks-domain ownership + TaskAuthorizationPort |

## Completion report

- Completed tasks: T001–T017
- Tests executed (T013–T015 + T016 close-out): `backend`/`frontend` `npm run typecheck` and `npm test` after `nvm use 22`. No migrate reset; no volume delete.
- Actual results (coordinator): backend typecheck exit 0; backend 41 files / 316 tests passed; frontend typecheck exit 0; frontend 20 files / 205 tests passed. AC-001–AC-015 met; unmet: none. Note: host `node -v` may still resolve cursor-agent Node 24 after `nvm use`; implementer T014 used explicit nvm Node 22 path.
- Known issues: AC-006 list 401/403 not reasserted in labels-api suite (relies on task-list auth); AC-013 soft-deleted GET covered in tasks-api
- Reviewer findings: PASS WITH NON-BLOCKING FINDINGS; Blocking: no; Failed ACs: none
- Memory updated: yes (`memory.md`); `implemented-features.md` catalog patch proposed, awaiting user confirmation
- Remaining work: none for 012; deferred next product work is **F** (checklists); later **C** audit remains separate
