# Implementation Plan: Dashboard

- **Feature ID:** 008-dashboard
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Q-045, Q-046, Q-047, Q-048, Q-049, and Q-050 are **Decided** (see spec §15). Follow those answers. Do not invent extras.

This ID is **008-dashboard**. Do not write `specs/005-audit/`. Do not reuse IDs `005`–`007`. Do not specify collaboration in this folder.

## 1. Summary

Add an owner-only derived dashboard: authenticated destination `/dashboard` inside existing `AuthenticatedLayout`, loaded from additive `GET /api/dashboard`.

Show owner-wide `projectCount`, `taskCount`, `pendingCount`, `completedCount`, and `overdueCount`, plus a per-project breakdown of the same task/pending/completed/overdue counts with project `id` and `name`. No extra lists, due-soon, charts, or activity.

Keep the verified modular monolith. Do **not** create a `dashboard` domain module or Prisma model. Aggregations belong in a `tasks` application/use-case that reads owned **active** project snapshots through the existing `ProjectAccessPort` direction (`tasks` → `projects` port, never Prisma cross-imports) and non-deleted tasks through `TasksRepository`.

Counting rules (Decided):

- Scope: active owned projects only (`archivedAt` null). Exclude archived projects and their tasks. Exclude `deletedAt` tasks.
- Pending = `TODO` + `IN_PROGRESS`. Completed = `DONE`. Pending and completed are disjoint.
- Overdue iff `dueDate` calendar date is strictly before UTC today, status is not `DONE`, and `dueDate` is not null. Due today is on time. Overdue may overlap pending. `DONE` is never overdue.

Frontend: register `/dashboard` under `AuthGuard` / `AuthenticatedLayout`. Add a top-app-bar nav link to `/dashboard`. Keep authenticated `/` → `/projects`, guest `/` → register, and the `/projects` card grid. Do not redesign workspace UI.

Q-048 is **branch B only** (additive derived-read). Do not compose per-project task list GETs for the dashboard.

No new npm dependencies. No migration unless inspection finds a real persistence gap (expected: none).

## 2. Current State

Inspected 2026-10-31. `001-foundation` through `007-workspace-ui` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks` under `backend/src/modules/`
- Prisma: `Project` (`ownerUserId`, `archivedAt`); `Task` (`status` TODO/IN_PROGRESS/DONE, optional `@db.Date` `dueDate`, `deletedAt`); no dashboard/cover/rank/palette fields
- Migrations: `20261026120000_init_system_probe`, `20261026133000_authentication`, `20261027120000_projects`, `20261029150000_tasks`
- `ProjectsRepository.listByOwnerId` returns **active** owned projects only (`archivedAt: null`), newest `createdAt` first
- `TasksRepository.listByProjectId` returns non-deleted tasks for **one** project; optional `status`/`priority` filters; **no** owner-wide or multi-project list
- HTTP: `GET /api/projects`; `GET /api/projects/:id`; `GET /api/projects/:projectId/tasks`; `GET/PATCH/DELETE /api/tasks/:id`; no aggregation resource
- `ProjectAccessPort.requireOwnedProject(actorId, projectId)` used by `tasks`; snapshot is `{ id, ownerUserId, archivedAt }`; `projects` does not import `tasks`
- `createApp` wires `TasksService(tasksRepository, projectAccess)` and `createTasksRouter`
- Frontend destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest `/` → register; authenticated `/` → `/projects`; unknown → not-found
- `AuthGuard` renders `AuthenticatedLayout` (top app bar, compact sidebar, main `<Outlet />`). DevTrack `Link` → `/projects`; Profile link; no Dashboard link
- `frontend/src/api/client.ts`: `credentials: 'include'`; project and per-project task list helpers; no dashboard helper
- Copied shadcn: `button`, `input`, `label`, `card`, `textarea`, `dialog`; `@dnd-kit/core` only

Absent:

- `/dashboard` destination and Dashboard nav link
- `GET /api/dashboard`
- Owner-wide / multi-project task query
- Dashboard UI

Limitations to respect:

- Do not create `backend/src/modules/dashboard/`
- Do not add `project-members`, audit, email, or AI
- Do not reset the database or delete `pgdata`
- Do not change existing project/task DTO fields
- Frontend tests currently assert dashboard/pending/overdue chrome is **absent** on project detail (`ProjectDetail.test.tsx`, `TasksPanel.test.tsx`); rewrite only the asserts that this feature supersedes, and only on the dashboard surface — do not put aggregate widgets on the Kanban board
- `listByOwnerId` cannot see archived projects; do not add `includeArchived` to `GET /api/projects`
- Do not replace `/projects` or change root redirects

## 3. Domain Boundaries

- Owning domain: **none new**. Dashboard is a derived read. Do not create a `dashboard`, `workspace`, or `analytics` backend module.
- Use-case owner: a `tasks` application/use-case (method on `TasksService` plus a pure counting helper in `tasks` domain/service) that asks `projects` for **active** owned-project snapshots through a **narrow port** (extend `ProjectAccessPort`). Keep dependency direction `tasks` → `projects` port. `projects` MUST NOT start importing `tasks`.
- Other domains:
  - `projects` — ownership, archive lifecycle, list/get of owned projects; port adapter reuses `listByOwnerId` (already active-only)
  - `tasks` — task persistence, `deletedAt`, `status`, `dueDate`, counting rules
  - `auth` — session middleware only
  - `users` — profile unchanged
  - `system` — health/ready/probes unchanged
- Invariants:
  - No new persisted entity
  - Soft-deleted tasks excluded
  - Archived projects and their tasks excluded
  - Null `dueDate` is not overdue; due today is not overdue; `DONE` is never overdue
  - Pending = `TODO` + `IN_PROGRESS`; completed = `DONE`; overdue may overlap pending
  - Owner-only; no members
  - `projects` Prisma repository MUST NOT select/mutate `Task`
  - `tasks` Prisma repository MUST NOT select/mutate `Project` beyond `projectId`
- Cross-domain interfaces:
  - Extend `OwnedProjectSnapshot` with `name: string` (existing Project field; needed for per-project summaries)
  - Add `ProjectAccessPort.listOwnedActiveProjects(actorId: string): Promise<OwnedProjectSnapshot[]>` implemented by `ProjectAccessAdapter` via existing `ProjectsRepository.listByOwnerId` (no new projects Prisma query, no `includeArchived`)
  - Add `TasksRepository.listNonDeletedByProjectIds(projectIds: string[]): Promise<Task[]>` (empty ids → empty list; `deletedAt` null only; restrict to the given ids)
  - Pure helper(s) for pending/completed/overdue given a `now: Date` (UTC calendar comparison), testable without HTTP or Prisma
- Dependency direction: domain objects MUST NOT import Express, HTTP, or Prisma. Controllers → services → repository contracts / ports. Prisma adapters implement repositories.
- Controller, service, repository, DTOs, routes, validators: add files only in `tasks` (plus the projects **port** extension). No empty folders. No `modules/dashboard/`.

## 4. API Contract

Reuse the existing error envelope and codes. Do not add a new error code.

**Unchanged (must stay):**

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/api/projects` | session | Owner active projects only; no `includeArchived` |
| GET | `/api/projects/:id` | session | Owner, including archived |
| GET | `/api/projects/:projectId/tasks` | session | Non-deleted tasks for that project |
| GET/PATCH/DELETE | `/api/tasks/:id` | session | Existing task contracts |
| GET/PATCH | `/api/users/me` | session | Unchanged |
| POST | `/api/auth/*` | as verified | Unchanged |
| GET | `/health`, `/ready` | public | Unchanged |

**Q-048 branch B only — additive derived-read**

- Method and path: `GET /api/dashboard`
- Auth: `requireAuth` session cookie `devtrack_session`
- Request DTO: none. No path params. Query MUST be empty; unknown query fields → `400` `VALIDATION_ERROR`. GET has no body requirement (do not require an empty-body validator).
- Register on the existing **tasks** router / controller (not a new module). Wire through `createApp` as today.
- Response DTO (JSON object; counts are integers ≥ 0):

```
DashboardSummaryResponseDto {
  projectCount: number
  taskCount: number
  pendingCount: number
  completedCount: number
  overdueCount: number
  projects: DashboardProjectSummaryDto[]
}

DashboardProjectSummaryDto {
  id: string          // project id
  name: string        // existing Project.name; identity for the summary row
  taskCount: number
  pendingCount: number
  completedCount: number
  overdueCount: number
}
```

- `projects` includes **every active owned project**, including those with zero live tasks (zeros on that row). Order matches existing owner active list: `createdAt` descending (`listByOwnerId`).
- Owner-wide `projectCount` MUST equal `projects.length`.
- Owner-wide task/pending/completed/overdue counts MUST equal the sums of the corresponding per-project counts.
- Owner-wide `pendingCount + completedCount` MUST equal `taskCount`.
- Do not include task arrays, due-soon, `deletedAt`, `archivedAt`, `description`, `ownerUserId`, `createdAt`, chart series, or other users’ rows.
- Status codes:
  - `200` success, including all zeros and empty `projects`
  - `401` unauthenticated
  - `400` unknown query fields (`VALIDATION_ERROR`)
  - `503` database unavailable
- `403` is not required for “empty other users’ data”; the actor receives only their own aggregates
- Do not sneak counts onto `GET /api/projects`

There is no branch A. Do not load the dashboard by composing `GET /api/projects` + per-project task lists.

## 5. Persistence

- Prisma model changes: **none expected**
- Relationships, constraints, indexes: unchanged (`Task.projectId`, `Project.ownerUserId`, `deletedAt`, `dueDate`, `archivedAt` already exist)
- Migration implications: do not create a migration unless inspection proves a persistence gap. Counts are derived.
- Repository contracts:
  - `TasksRepository.listNonDeletedByProjectIds`
  - `ProjectAccessPort.listOwnedActiveProjects` (adapter → existing `listByOwnerId`; no projects repository method required unless the adapter cannot map snapshots otherwise)
  - MUST NOT add dashboard tables
  - MUST NOT broaden `listByOwnerId` to archived rows
- Transactions: read-only aggregation; no write transaction required
- Compatibility risks: do not change `GET /api/projects` query or DTO

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

- Shell: `AuthenticatedLayout` only. Keep top app bar, compact sidebar, palettes (`devtrack.uiPalette`), profile, logout.
- Destination: register `/dashboard` under the existing `AuthGuard` parent in `frontend/src/App.tsx` (same layout as `/projects` and `/profile`).
- Navigation: add a text `Link` labeled **Dashboard** to `/dashboard` in the authenticated top app bar (alongside Profile). Do not replace DevTrack → `/projects`. Do not put aggregate widgets in the sidebar project list.
- Roots: `RootRedirect` stays authenticated `/` → `/projects`. Guest `/` stays register. Guest login/register stay without product sidebar.
- `/projects` card grid stays. Do not render dashboard counts on `KanbanBoard`.
- Page: `frontend/src/routes/DashboardPage.tsx` (same destination pattern as `ProjectsHome` / `ProfileDestination`). Reuse `card` / typography tokens. Show:
  - Owner-wide project, task, pending, completed, overdue counts
  - Per-project rows with name plus task/pending/completed/overdue counts
  - Loading, empty zeros, success, error, unauthenticated → login
- API integration: typed `getDashboard()` in `frontend/src/api/client.ts` + types in `types.ts`. Always `credentials: 'include'`. Do not also N+1 `listTasks` for this page.
- Do not add chart libraries, `next-themes`, DropdownMenu, or `@dnd-kit/sortable`.

## 7. Files

Expected (create/extend only these kinds of files):

- `frontend/src/routes/DashboardPage.tsx` + `DashboardPage.test.tsx`
- `frontend/src/App.tsx` — register `/dashboard`
- `frontend/src/layout/AuthenticatedLayout.tsx` — Dashboard nav link
- `frontend/src/api/client.ts` / `types.ts` / `client.test.ts` — `getDashboard`
- `frontend/src/App.test.tsx` — destination, nav link, roots, `/projects` still card grid
- `backend/src/modules/tasks/service/tasks-service.ts` — `getDashboard(actorId, now?: Date)`
- `backend/src/modules/tasks/domain/` (or service helper) — pure pending/completed/overdue classification using UTC calendar dates
- `backend/src/modules/tasks/dto/` — dashboard response DTO mapper
- `backend/src/modules/tasks/validators/` — empty/strict query for `GET /api/dashboard`
- `backend/src/modules/tasks/controller/tasks-controller.ts` — handler
- `backend/src/modules/tasks/routes/tasks-routes.ts` — `GET /api/dashboard` + `requireAuth`
- `backend/src/modules/tasks/repository/tasks-repository.ts` + Prisma + in-memory fake — `listNonDeletedByProjectIds`
- `backend/src/modules/projects/access/project-access-port.ts` + adapter + tasks `FakeProjectAccessPort` — `name` on snapshot + `listOwnedActiveProjects`
- Tests under existing `tasks` test tree (service, API SuperTest, repository, pure helper)

Do not add `backend/src/modules/dashboard/`. Do not add files under `specs/` except this feature’s artifacts.

## 8. Dependencies and Config

- New packages: none
- New env vars: none
- Docker: none
- Justify each new dependency: N/A; charts, extra CSS frameworks, and theme libraries are forbidden

## 9. Security and Failures

- `requireAuth` on `GET /api/dashboard`
- Owner scope in the use-case: only `listOwnedActiveProjects(actorId)` then tasks for those ids
- Zod at the HTTP query boundary
- Map domain/infrastructure errors to the existing envelope
- Soft-delete and archive exclusion are data-integrity rules, not UI filters only
- Return only the actor’s aggregates
- Database down → `503`
- Do not log secrets
- UTC today MUST be derived from an injectable `now` so tests can fix the calendar date

## 10. Testing

| Area | Coverage |
| --- | --- |
| Pure helper / use-case | Owner isolation inputs; exclude `deletedAt`; exclude archived; null due date not overdue; due today not overdue; past UTC date overdue for `TODO`/`IN_PROGRESS`; `DONE` never overdue; pending = TODO+IN_PROGRESS; completed = DONE; overlap; empty zeros; active project with zero tasks still listed |
| Repository | `listNonDeletedByProjectIds` returns non-deleted only and only for given ids; skip if `DATABASE_URL` missing |
| API SuperTest | `GET /api/dashboard` 200 zeros, 200 with counts, 401, 400 unknown query, AC-003 isolation, AC-004 after DELETE, AC-015 archived excluded, AC-014/AC-016 counting |
| Frontend Testing Library | `/dashboard` in shell; Dashboard nav link; loading/empty/success/error; credentials; guest `/dashboard` → login; authenticated `/` → `/projects`; `/projects` card grid remains; Kanban still has no pending/overdue widgets |
| Regression | `frontend` and `backend` typecheck + existing suites |

## 11. Sequence

1. T001 inspect current code (no edits).
2. T002 stop unless artifacts are **Approved** (Qs are already Decided; Draft is still a stop).
3. T003 confirm no persistence gap; no migration.
4. Extend port + task query; implement aggregation use-case with decided rules (T004–T005).
5. Add `GET /api/dashboard` (T006). Required; not optional.
6. Backend tests (T007).
7. Frontend client + `/dashboard` UI + nav link (T008–T009).
8. Frontend tests (T010).
9. Typecheck, targeted tests, AC pass, independent review, memory update (T011–T014).

Do not `prisma migrate reset` or delete volumes.

## 12. Risks

- **Approval gate:** artifacts remain Draft until explicit user approval. Alternative: wait; do not implement.
- **UTC vs local “today”:** Q-046 decided UTC calendar dates. Users west/east of UTC may see overdue flip at UTC midnight, not local midnight. Recorded, not reopened.
- **Circular domains:** putting the use-case in `projects` and importing `tasks` would reverse the current graph. Alternative: keep `tasks` → `projects` port.
- **New dashboard module:** would invent a bounded context with no persistence. Alternative: use-case over existing repos.
- **In-memory aggregation:** one derived-read may load all live tasks for the owner’s active projects. Accepted; no pagination specified.
- **Workspace-ui tests** that forbid “pending”/“overdue” on the board must stay valid for Kanban; dashboard text belongs on `/dashboard` only.
- **Port snapshot `name`:** required for per-project summaries; do not return full `PublicProjectDto` from the dashboard.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `DashboardPage` in `AuthenticatedLayout`; nav link; counts from use-case | Frontend tests + live/UI check after approval |
| AC-002 | `requireAuth` on `GET /api/dashboard`; guest guard | SuperTest 401; guest redirect test |
| AC-003 | Owner-scoped use-case | Isolation tests |
| AC-004 | Repository/use-case skip `deletedAt` | Unit + API |
| AC-005 | Null due date not overdue | Unit |
| AC-006 | Empty → zeros `200` | API/UI |
| AC-007 | Derived from persistence; archive drops rows | Integration after writes |
| AC-008 | No shell redesign; roots unchanged; no members/audit | Regression suites; repo inspection |
| AC-009 | Tasks use-case over repos; `GET /api/dashboard` additive | Review + typecheck |
| AC-010 | Client `credentials: 'include'` | Frontend tests |
| AC-011 | Existing error handler; DTO omits `deletedAt` | Envelope tests |
| AC-012 | Executed commands | T011 actual results |
| AC-013 | Recorded Q-045–Q-050 only | T012 + review |
| AC-014 | UTC-strict-before-today; `DONE` never | Unit + API |
| AC-015 | Active owned only via port | Unit + API |
| AC-016 | Pending/completed/overlap | Unit + API |
| AC-017 | `/` → `/projects`; guest `/` → register; card grid stays | Frontend tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
