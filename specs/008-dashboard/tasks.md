# Tasks: Dashboard

- **Feature ID:** 008-dashboard
- **Specification:** `spec.md`
- **Plan:** `plan.md`
- **Status:** Verified

Execute only approved tasks. Keep them small, ordered, and verifiable. Update status only from verified progress. Do not mark a task complete just because files exist. Do not run destructive database or Docker operations without authorization.

These artifacts are **Approved**. Q-045–Q-050 are **Decided** and recorded. Implement T001–T014 in order. T002 MUST stop if artifacts are not Approved.

This ID is **008-dashboard**. Do not write `specs/005-audit/`. Do not reuse IDs `005`–`007`. Do not specify or implement collaboration, members, roles, audit, email, or AI. Do not create a `dashboard` backend domain.

Recorded constraints still in force:

- Product: owner-wide plus per-project project/task summaries and pending, completed, and overdue counts from persisted data (`prompt.md`, Q-050).
- Destination `/dashboard` in `AuthenticatedLayout` with a top-app-bar nav link. Authenticated `/` → `/projects`. Guest `/` → register. Do not replace the `/projects` card grid (Q-045).
- `GET /api/dashboard` additive derived-read; session cookie; owner-scoped (Q-048).
- Pending = `TODO` + `IN_PROGRESS`. Completed = `DONE`. Overdue may overlap pending. `DONE` never overdue (Q-049).
- Overdue iff `dueDate` calendar date strictly before UTC today. Due today is on time. Null `dueDate` is never overdue (Q-046, FR-004).
- Active owned projects only. Exclude archived owned projects and their tasks. Do not add `includeArchived` on `GET /api/projects` (Q-047).
- Exclude soft-deleted tasks.
- Aggregations in a `tasks` use-case over the projects port; no `dashboard` domain; no Prisma dashboard model.
- Fit `AuthenticatedLayout`; do not redesign workspace-ui.
- Q-006, Q-007, Q-009, Q-015, Q-017 stay deferred.

## Checklist

### Phase 1 — Preparation

- [x] T001 Inspect existing implementation and conventions: `AuthenticatedLayout`, `App.tsx` destinations, `RootRedirect`, `frontend/src/api/client.ts`, `ProjectsRepository.listByOwnerId` (active only), `TasksRepository.listByProjectId` (one project, non-deleted), `ProjectAccessPort`, Prisma `Project`/`Task`, tests that assert no dashboard/pending/overdue on Kanban. Record files to extend. Do not change code in this task.
- [x] T002 Confirm `spec.md`, `plan.md`, and `tasks.md` are **Approved**. Reconfirm Q-045–Q-050 remain recorded as Decided. Reconfirm: owner-only; no `dashboard` domain; no `project-members`; no audit ID `005`–`007`; no `specs/005-audit/`; no email/AI; no workspace-ui redesign; no `includeArchived`; no migration unless T003 finds a gap; Q-006/007/009/015/017 deferred. **Stop if artifacts are Draft or not Approved.**

### Phase 2 — Backend

- [x] T003 Confirm persistence: existing `Project` and `Task` fields are sufficient to derive summaries and the three counts. Confirm no dashboard table/field is required. Do not add a Prisma model, index, or migration unless a real gap is documented. Do not `migrate reset` or delete volumes. Do not add `includeArchived` to `GET /api/projects`.
- [x] T004 Implement the `tasks` aggregation use-case over existing `projects` and `tasks` repository contracts / `ProjectAccessPort` using the recorded rules: active owned projects only; exclude `deletedAt`; pending = `TODO`+`IN_PROGRESS`; completed = `DONE`; overdue = non-`DONE` with `dueDate` calendar date strictly before UTC today; null/`DONE`/due-today never overdue; overlap pending∩overdue allowed. Inject `now` for UTC today. Keep dependency direction `tasks` → `projects` port; do not import Prisma repositories across domains. Do not create `backend/src/modules/dashboard/`. Do not add HTTP in this task.
- [x] T005 Add repository/port query methods T004 needs: `ProjectAccessPort.listOwnedActiveProjects` (adapter via existing `listByOwnerId`; include `name` on snapshots) and `TasksRepository.listNonDeletedByProjectIds`. Map Prisma behind the owning repository. Empty project-id list returns no tasks. Do not change list/get HTTP behavior of existing routes. No schema change.
- [x] T006 Implement additive `GET /api/dashboard`: response DTO (`projectCount`, `taskCount`, `pendingCount`, `completedCount`, `overdueCount`, `projects[]` with `id`, `name`, and the same task/pending/completed/overdue counts), Zod strict empty query, controller, tasks routes, `requireAuth`, existing error envelope. `200` including zeros. `401` unauthenticated. `400` unknown query. Do not alter existing project/task contract fields. Do not add charts or task lists to the payload.
- [x] T007 Add backend tests for AC-002–AC-007, AC-009, AC-011, AC-014, AC-015, AC-016: owner isolation, zeros, zero-task active project still listed, soft-delete exclusion, archived exclusion, null/today not overdue, past UTC date overdue for pending statuses, `DONE` never overdue, pending/completed mapping and overlap, 401, 400 unknown query. Reuse Vitest/SuperTest.

### Phase 3 — Frontend

- [x] T008 Implement API integration: typed `getDashboard()` for `GET /api/dashboard`. Always `credentials: 'include'`. No bearer token storage. No new npm dependency. Do not compose per-project `listTasks` for this page.
- [x] T009 Implement `/dashboard` UI inside `AuthenticatedLayout`: owner-wide totals plus per-project breakdown (name + counts). Add a top-app-bar **Dashboard** nav link to `/dashboard`. Cover loading, empty zeros, success, error, and unauthenticated. Keep authenticated `/` → `/projects` and guest `/` → register. Do not redesign `/projects` card grid, Kanban columns, Dialogs, palettes, or sidebar. Do not put those counts on the Kanban board. Do not change guest login/register. Do not replace the DevTrack brand link.
- [x] T010 Add frontend tests for AC-001, AC-002 (guest), AC-006, AC-008, AC-010, AC-017: `/dashboard` in the shell, Dashboard nav link, credentials, no token storage, empty zeros, authenticated `/` still `/projects`, `/projects` card grid remains, Kanban still without board-level aggregate widgets, no Trello branding, no extra CSS framework. Rewrite only asserts this feature supersedes.

### Phase 4 — Verification

- [x] T011 Run `backend` `npm run typecheck` and `npm test` if T003–T007 changed backend files; always run `frontend` `npm run typecheck` and `npm test`. Report actual results. Do not run `prisma migrate reset` or delete Docker volumes. Do not claim checks passed without running them.
- [x] T012 Verify acceptance criteria AC-001–AC-017 against the spec and the recorded Q-045–Q-050 answers. Record any unmet criterion. Confirm no dashboard Prisma model, no `project-members`, no `specs/005-audit/`, no collaboration in this folder, no `includeArchived`, no charts/due-soon/activity.
- [x] T013 Obtain independent review and resolve blocking findings with a new implementation pass if needed. Do not treat implementer claims as proof.
- [x] T014 Update `memory.md` (and only docs that changed) from verified state. Record Q-045–Q-050 as Decided and implemented only after evidence. Keep Q-006, Q-007, Q-009, Q-015, and Q-017 deferred. Keep collaboration and audit marked unimplemented. Do not write `005-audit` artifacts. Do not mark tasks complete without evidence.

## Dependencies

| Task | Depends on | Verification |
| ---- | ---------- | ------------ |
| T001 | none | Inspection notes; no code changes |
| T002 | T001 | Artifacts Approved (Draft is a stop) |
| T003 | T002 | No migration (or documented gap only) |
| T004 | T003 | Use-case over existing repos; no dashboard module |
| T005 | T004 | Port + multi-project task query; existing list HTTP unchanged |
| T006 | T005 | `GET /api/dashboard` additive; envelope; no extra lists |
| T007 | T004, T006 | Backend tests for applicable ACs |
| T008 | T006, T007 | Client uses `credentials: 'include'` |
| T009 | T008 | `/dashboard` in existing shell; nav link; roots unchanged |
| T010 | T009 | Frontend tests for applicable ACs |
| T011 | T007, T010 | Actual typecheck/test results |
| T012 | T011 | AC-001–AC-017 evidence |
| T013 | T012 | Independent review |
| T014 | T013 | `memory.md` matches repo |

## Acceptance coverage

| Criterion | Task(s) | Evidence |
| --------- | ------- | -------- |
| AC-001 | T009, T010, T012 | `/dashboard` content in shell; nav link |
| AC-002 | T006, T007, T010 | 401 / guest redirect |
| AC-003 | T004, T007 | Owner isolation |
| AC-004 | T004, T007 | Soft-deleted excluded |
| AC-005 | T004, T007 | Null due date not overdue |
| AC-006 | T007, T010 | Zeros, not error |
| AC-007 | T004, T007, T012 | Counts follow persistence; archive drops |
| AC-008 | T009, T010, T012 | Existing slices remain |
| AC-009 | T003–T006, T012 | No dashboard domain/schema; additive GET |
| AC-010 | T008–T010 | Credentials; states; no extra deps |
| AC-011 | T006, T007 | Envelope; no secrets |
| AC-012 | T011 | Executed commands |
| AC-013 | T002, T012 | Draft stop; recorded Qs only |
| AC-014 | T004, T007 | UTC overdue rule; `DONE` never |
| AC-015 | T004, T007 | Archived excluded; no `includeArchived` |
| AC-016 | T004, T007 | Pending/completed/overlap |
| AC-017 | T009, T010 | Roots and `/projects` grid unchanged |

## Completion report

- Completed tasks: T001–T014
- Tests executed: Coordinator independently re-ran Compose `backend` `npm run typecheck` and `npm test`, Compose `frontend` `npm run typecheck` and `npm test` (Node v22.23.4)
- Actual results: backend typecheck exit 0; backend `npm test` 21 files / 177 tests passed, exit 0. Frontend typecheck exit 0; frontend `npm test` 17 files / 141 tests passed, exit 0. No Prisma migration. No `migrate reset`. No volume delete. No `backend/src/modules/dashboard/`. `GET /api/projects` still has no `includeArchived` filter. No new npm dependency. No chart library. No extra CSS framework. Live Compose needed `frontend` rebuild and `backend` restart so `GET /api/dashboard` was served (tsx watch had not picked up the new route).
- T001 files to extend (backend this batch): `ProjectAccessPort` / adapter / fake; `TasksRepository` / Prisma / in-memory; `TasksService` + `domain/dashboard-summary.ts`; tasks DTO/validator/controller/routes; tasks tests.
- T002: `spec.md`, `plan.md`, `tasks.md` Status Approved. Q-045–Q-050 Decided. Stop condition not met.
- T003: existing `Project` (`ownerUserId`, `name`, `archivedAt`) and `Task` (`status`, `dueDate`, `deletedAt`, `projectId`) are sufficient. No dashboard model/index/migration.
- T008: typed `getDashboard()` in `frontend/src/api/client.ts` + DTOs in `types.ts`; `credentials: 'include'`; no bearer token; does not call per-project `listTasks`.
- T009: `/dashboard` in `App.tsx` under `AuthGuard`/`AuthenticatedLayout`; top-app-bar Dashboard nav link; owner-wide totals plus per-project name+counts; loading/empty zeros/success/error/unauthenticated. Authenticated `/` still `/projects`; guest `/` still register; DevTrack brand still `/projects`; Kanban still has no board-level aggregates.
- T010: `client.test.ts` dashboard cases; `DashboardPage.test.tsx`; `App.test.tsx` guest `/dashboard` → login, authenticated `/dashboard` in shell, roots, `/projects` card grid, Kanban without pending/overdue widgets, no Trello. Kanban `pending`/`overdue` absence asserts kept.
- T012: AC-001–AC-017 met. No dashboard Prisma model, no `project-members`, no `specs/005-audit/`, no `includeArchived`, no charts/due-soon/activity. Browser: empty zeros; after project+task, totals and per-project counts; pending∩overdue after `dueDate` 2020-01-01; `/projects` card grid remains; guest `/dashboard` → `/login`; Kanban has no board-level aggregates.
- Known issues: local host `backend/node_modules` incomplete (`argon2` native rebuild). Live create-task date input did not persist in Chrome MCP fill (dueDate stayed null until PATCH); not a dashboard counting bug. Compose `tsx watch` did not load the new route until backend restart.
- Reviewer findings: PASS. Blocking: no. Failed ACs: none.
- Memory updated: yes (`memory.md`, `proposed-features.md`)
- Remaining work: none for 008. Next: `009-collaboration`.
