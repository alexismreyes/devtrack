# Implementation Plan: Tasks

- **Feature ID:** 004-tasks
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

Q-022, Q-023, Q-024, Q-025, Q-026, and Q-027 are answered and recorded in `spec.md` and this plan. These artifacts MUST stay Draft until explicitly Approved. Do not implement while status is Draft. Do not write `005-audit` artifacts in this feature.

## 1. Summary

Add a `tasks` domain to the existing modular monolith so an authenticated project owner can create, read, update, list, filter, and soft-delete tasks associated with a project they own.

A task stores `title`, optional `description`, `status` (`TODO` | `IN_PROGRESS` | `DONE`), `priority` (`LOW` | `MEDIUM` | `HIGH`), optional calendar due date, and nullable `deletedAt`. On create, omitted `status` defaults to `TODO` and omitted `priority` defaults to `MEDIUM`. `projectId` is taken from the path and is immutable. Authorization is parent project ownership, the same rule as `003-projects`. `tasks` does not copy `ownerUserId`. `projects` exposes a narrow access port; `tasks` MUST NOT import the `projects` Prisma repository.

Soft-delete is HTTP `DELETE /api/tasks/:id` that sets `deletedAt` and MUST NOT remove the row. Deleted tasks are excluded from list and treated as `404` on GET, PATCH, and a second DELETE. There is no restore endpoint. When the parent project is archived, GET and list still succeed; create, update, and soft-delete return `409` `CONFLICT`. List accepts optional `status` and/or `priority` query filters.

Reuse the verified session cookie, CORS credentials, Zod boundary validation, error envelope, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and Vitest + Testing Library + SuperTest stack. Persistence is an additive versioned Prisma migration under `backend/prisma/`. Prisma stays behind the `tasks` repository.

Do not implement Kanban drag-and-drop, dashboard aggregates, `project-members`, assignees, comments, or `005-audit`. Do not introduce a frontend router (Q-016). Keep `GET /health` and `GET /ready` public; probes remain authenticated.

## 2. Current State

Inspected 2026-10-29. `001-foundation`, `002-authentication`, and `003-projects` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users`, `projects` under `backend/src/modules/`
- Prisma models `SystemProbe`, `User`, `AuthPasswordCredential`, `AuthSession`, `Project` (`name`, optional `description`, `ownerUserId`, `archivedAt`)
- Migrations `20261026120000_init_system_probe`, `20261026133000_authentication`, `20261027120000_projects`
- Shared error envelope with codes `VALIDATION_ERROR`, `CONFLICT`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`
- `createApp` wires CORS with credentials, `cookie-parser`, `auth` / `users` / `system` / `projects` routers, and `createRequireAuth`
- `projects` service authorizes with `assertProjectOwner(actorId, ownerUserId)`; `ProjectNotFoundError` → `404`; `ProjectForbiddenError` → `403`; `ProjectArchivedError` → `409`
- `users` already exposes `UsersIdentityPort` for `auth`; that pattern is the template for a `projects` access port
- Frontend: Vite React app; authenticated chrome switches projects list vs `ProjectDetail` via `selectedProjectId` in `App.tsx`; `frontend/src/api/client.ts` supports GET/POST/PATCH with `credentials: 'include'`; empty JSON bodies already parse as `undefined` (needed for `204`); no router; no tasks UI
- Env: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db

Absent:

- `tasks` module
- Task table / Prisma model / enums / `deletedAt`
- Project access port
- Task HTTP routes
- Task UI
- `DELETE` on the frontend `request()` helper

Limitations to respect:

- Frontend `request()` supports GET, POST, and PATCH only. Extend it with DELETE for the soft-delete HTTP operation (`204` empty body).
- `CONFLICT` already maps archived project PATCH. Reuse the same code for task writes on an archived parent via a `tasks` domain error, not by importing `ProjectArchivedError` into `tasks`.
- Do not add empty `project-members`, Kanban, or `005-audit` modules
- Do not reset the database or delete the named volume without authorization
- Q-016 remains deferred; `App.tsx` view/state switching plus selected project id is the integration point
- `projects` repository `listByOwnerId` returns active projects only; owner GET of an archived project still works

## 3. Domain Boundaries

- Owning domain: `tasks` (task identity, project association, title/description/status/priority/due date, defaults, immutable `projectId`, soft-delete via `deletedAt`, task list/filters, task use cases)
- Other domains: `projects` (project identity, owner authorization, archive lifecycle, narrow access port), `auth` (session authentication middleware only), `users` (existing identity; no task use cases), `system` (probes and readiness unchanged). Do not create `project-members`. Do not create an audit domain.
- Invariants:
  - Task identity and created time are system-assigned
  - A task belongs to one project; `projectId` does not change after create
  - `title` is required and non-empty after trim; `description` is optional (null when omitted/blank)
  - `title` is not unique, including per project
  - `status` is `TODO` | `IN_PROGRESS` | `DONE`; `priority` is `LOW` | `MEDIUM` | `HIGH`; no workflow
  - Create defaults: omitted `status` → `TODO`; omitted `priority` → `MEDIUM`
  - Due date is an optional calendar date; past dates are allowed
  - `deletedAt` null means live; set on soft-delete; never cleared by an API
  - Only the parent project owner may create, read, update, list, filter, or soft-delete the task
  - Deleted tasks are not found to any caller
  - Writes against an archived parent conflict
  - No assignee, comments, membership, or audit fields
- Cross-domain interfaces:
  - `projects` MUST expose a narrow `ProjectAccessPort` (same idea as `UsersIdentityPort`) that returns an owned-project snapshot or throws the existing project not-found / forbidden errors
  - Snapshot MUST include at least `id`, `ownerUserId`, and `archivedAt` so `tasks` can apply Q-024 without querying Prisma `Project`
  - The port MUST NOT throw merely because the project is archived; GET/list still need the snapshot
  - `tasks` MUST NOT import `prisma-projects-repository` or Prisma `Project` / `User` models in domain/service code
  - `projects` MUST NOT import `tasks`
  - `users` MUST NOT import `tasks`
  - `auth` middleware authenticates only; it MUST NOT compare project ownership or task fields
  - `system` MUST NOT call `tasks`
- Dependency direction: domain objects MUST NOT import Express, HTTP objects, Prisma Client, or database-driver APIs. Controllers depend on services. Services depend on domain behavior, the `tasks` repository contract, and `ProjectAccessPort`. Prisma adapters implement repository contracts. Shared infrastructure stays config, Prisma Client construction, cookie parsing, CORS, and centralized error mapping.
- Controller, service, repository, DTOs, routes, validators, domain objects: owned by `tasks` under `backend/src/modules/tasks/`.
- Access port: owned by `projects` under `backend/src/modules/projects/access/`.

Suggested roots:

- `backend/src/modules/tasks/{domain,dto,repository,service,controller,routes,validators,tests}`
- `backend/src/modules/projects/access/{project-access-port.ts,project-access-adapter.ts}`

Do not add extra domains to fill the folder list.

## 4. API Contract

Reuse the existing error envelope. Add task-not-found mapped to existing `NOT_FOUND` `404`. Reuse `FORBIDDEN` `403` for authenticated non-owners of live resources. Reuse `VALIDATION_ERROR` `400`, `UNAUTHENTICATED` `401`, `CONFLICT` `409` for writes on an archived parent, `SERVICE_UNAVAILABLE` `503`, `INTERNAL_ERROR` `500`.

Do not reuse `UserNotFoundError` → `401` for a missing task or project. Do not introduce a new error code. Map a `tasks` parent-archived domain error to existing `CONFLICT`; do not import `ProjectArchivedError` into `tasks`.

Public task DTO (success bodies). Do not include `deletedAt`:

```
{
  id: string,
  projectId: string,
  title: string,
  description: string | null,
  status: "TODO" | "IN_PROGRESS" | "DONE",
  priority: "LOW" | "MEDIUM" | "HIGH",
  dueDate: string | null,
  createdAt: string
}
```

`createdAt` is ISO-8601 datetime. `dueDate` when not null is `YYYY-MM-DD` (calendar date). Never password, hash, session id, Prisma metadata, or `deletedAt`.

List wrapper: `{ tasks: PublicTaskDto[] }`. Order: newest `createdAt` first. No pagination product feature. Soft-deleted rows are never included.

All task routes: valid session cookie required. Authorization is parent project ownership, never taken from the body as a client-supplied owner.

Collection routes are nested under the project so association is explicit. Item routes use task identity.

Authorization/not-found order:

1. Missing or invalid session → `401`
2. Collection routes: unknown project → `404`; authenticated non-owner of an existing project → `403`
3. Item routes: unknown or soft-deleted task → `404` for every caller, including the owner
4. Item routes: live task whose parent is not owned → `403`
5. Create/update/soft-delete of an authorized live task whose parent is archived → `409`

### `POST /api/projects/:projectId/tasks` (protected)

- Auth: valid session cookie
- Request DTO: `{ title: string, description?: string | null, dueDate?: string | null, status?: TaskStatus, priority?: TaskPriority }`
- Validation: `title` required, non-empty after trim; `description` optional; omit/null/blank `description` stored as null; `dueDate` optional ISO calendar date or null; `status`/`priority` optional valid enumerations; omitted `status` becomes `TODO`; omitted `priority` becomes `MEDIUM`; null `status` or `priority` is `400`; `:projectId` MUST be a UUID or `400`; reject `id`, `createdAt`, `deletedAt`, unknown fields (`strict` Zod); reject client-supplied `projectId` in the body (association is the path)
- Response DTO: public task DTO; `projectId` is the path id
- Success: `201`
- Error cases: `400` validation; `401`; `403` authenticated but not project owner; `404` unknown project; `409` parent archived; `503`; `500`
- Duplicate `title` is not an error

### `GET /api/projects/:projectId/tasks` (protected)

- Auth: valid session cookie
- Request query DTO: `{ status?: TaskStatus, priority?: TaskPriority }` — either, both, or neither. Reject unknown query keys. Invalid enumerations → `400`
- Response DTO: `{ tasks: PublicTaskDto[] }` of non-deleted tasks with that `projectId` when the actor owns the project, optionally filtered
- Success: `200`, including `{ tasks: [] }`, including when the parent is archived
- Error cases: `400` invalid project id or query; `401`; `403`; `404` unknown project; `503`; `500`

### `GET /api/tasks/:id` (protected)

- Auth: valid session cookie
- Request DTO: none. `:id` MUST be a UUID or `400`
- Response DTO: public task DTO
- Success: `200` when the actor owns the parent project and `deletedAt` is null, including when the parent is archived
- Error cases: `400` invalid id; `401`; `403` authenticated but not owner of a live task’s parent; `404` unknown or soft-deleted task id; `503`; `500`

### `PATCH /api/tasks/:id` (protected)

- Auth: valid session cookie
- Request DTO: at least one of `{ title?: string, description?: string | null, status?: TaskStatus, priority?: TaskPriority, dueDate?: string | null }`
- Validation: if `title` is present it MUST be non-empty after trim; if `description` is present, null or blank after trim stores null; if `dueDate` is present, null clears it, otherwise it MUST be a calendar date; `status`/`priority` if present MUST be valid enumerations; reject `id`, `createdAt`, `deletedAt`, `projectId`, unknown fields
- Response DTO: updated public task DTO
- Success: `200` when the actor owns the parent project, the task is not deleted, and the parent is not archived
- Error cases: `400`; `401`; `403`; `404` unknown or deleted; `409` parent archived; `503`; `500`

### `DELETE /api/tasks/:id` (protected) — soft-delete, not a hard-delete of the row

- Auth: valid session cookie
- Request DTO: none. Reject unexpected JSON object fields if a body is sent. `:id` MUST be a UUID or `400`
- Behavior: set `deletedAt` to now when currently null. MUST NOT remove the database row. MUST NOT expose a restore route.
- Success: `204` empty body
- Error cases: `400` invalid id; `401`; `403` live task, not owner; `404` unknown or already deleted; `409` parent archived; `503`; `500`

### Existing routes

Unchanged from `003-projects`: auth register/login/logout, `GET`/`PATCH /api/users/me`, project CRUD/archive/unarchive, public `GET /health` and `GET /ready`, authenticated probes.

### Error envelope

`{ error: { code, message } }` plus HTTP status. No secrets, stack traces, hashes, connection strings, or session secrets.

### CORS

Unchanged: configured origin with `credentials: true`; never `*`.

## 5. Persistence

- Prisma schema stays `backend/prisma/schema.prisma`. Add `Task` owned by `tasks`, plus Prisma enums for status and priority. Keep `SystemProbe`, `User`, `AuthPasswordCredential`, `AuthSession`, and `Project`. Do not add task or user ownership to `SystemProbe`. Do not add audit tables.
- Prisma enums:
  - `TaskStatus`: `TODO`, `IN_PROGRESS`, `DONE`
  - `TaskPriority`: `LOW`, `MEDIUM`, `HIGH`
- `Task` (tasks), mapped table `tasks`:
  - `id` UUID string, system-generated, primary key
  - `projectId` UUID, FK to `projects.id`, `onDelete: Restrict`
  - `title` String, required; no unique constraint (including no per-project unique)
  - `description` String?, nullable
  - `status` `TaskStatus`, `@default(TODO)`
  - `priority` `TaskPriority`, `@default(MEDIUM)`
  - `dueDate` DateTime?, `@db.Date`, nullable
  - `createdAt` DateTime, system-set
  - `deletedAt` DateTime?, nullable; null means live
  - Index on `projectId` for project-scoped listing
  - Do not add `ownerUserId`
  - Do not add `archivedAt` on Task
- Application-layer defaults still apply in domain/service so omitted create values are testable without Prisma. Schema defaults match Q-025 for new rows.
- `Project` reverse relation `tasks Task[]` is required by Prisma. The `projects` repository MUST NOT select or mutate that relation. The `tasks` repository is the only module that queries `Task`.
- Migration: new versioned additive migration under `backend/prisma/migrations/`. Creation, apply/deploy, and Client generation remain separate documented steps. Production still uses `prisma migrate deploy`. Do not `migrate reset` or delete `pgdata` without authorization.
- Repository contract (shape, not Prisma types):
  - `create({ projectId, title, description, status, priority, dueDate })` — persists `deletedAt` null
  - `findById(id)` — returns the domain `Task` including a deleted row, or null if missing
  - `listByProjectId(projectId, { status?, priority? })` — non-deleted tasks for that project, optional equality filters, newest `createdAt` first
  - `update(id, { title?, description?, status?, priority?, dueDate? })` — live rows only; callers MUST NOT use this to set `deletedAt` or `projectId`
  - `softDelete(id)` — set `deletedAt` to now when currently null
  - No restore method
  - Returns domain `Task`, never Prisma types
- Transactions: single-row create/update/soft-delete do not need a multi-step transaction. Do not add a generic unit-of-work. Authorization is a `ProjectAccessPort` call plus a task repository call, not a distributed transaction.
- Compatibility: existing auth, probe, and project rows remain. Map Prisma records to domain objects inside the `tasks` adapter.

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

No client-side routing library (Q-016 deferred). Local view/state switching is enough: keep `selectedProjectId` in `App.tsx`. Host task list/create/detail inside `ProjectDetail` (or a `frontend/src/tasks/` child used by it), with a selected task id in component state.

Views (authenticated, on a selected owned project):

- Task list for that project (empty, loading, success, error, unauthenticated, forbidden)
- Optional status and/or priority filter controls on that list
- Create task (`title` required, `description` optional, due date optional, status/priority optional with `TODO`/`MEDIUM` defaults)
- Task detail / update
- Soft-delete control that calls `DELETE /api/tasks/:id` and then treats the task as gone
- When the selected project is archived: still show list/detail; disable or fail create/update/soft-delete with a conflict message
- Keep register, login, logout, own-profile, project list/detail/archive/unarchive, and probe UI
- Do not build Kanban columns or drag-and-drop
- Do not add restore UI

States: loading, empty, success, validation/error, unauthenticated, forbidden, conflict. No design system.

API integration: extend `frontend/src/api/client.ts` and `types.ts` for create, list (with query filters), get, patch, and DELETE. Keep `credentials: 'include'` and `VITE_API_URL`. Handle `204` empty body. Do not store session ids or bearer tokens in JS. Do not treat a hidden button as authorization.

State: page/component state plus selected project id and selected task id is enough. No global store library.

## 7. Files

Expected new or updated files. Names may shift slightly; roots MUST remain `frontend/` and `backend/`.

**backend/**

- `prisma/schema.prisma` — add `TaskStatus`, `TaskPriority`, `Task` (`deletedAt` included), and `Project.tasks`; keep existing models
- `prisma/migrations/<timestamp>_tasks/` — additive migration
- `src/infrastructure/http/error-handler.ts` — map `TaskNotFoundError` to `NOT_FOUND`; map any new task-forbidden name to `FORBIDDEN` if not reusing `ProjectForbiddenError`; map parent-archived task write error to `CONFLICT`
- `src/app.ts` / `src/main.ts` — compose `tasks` router, `tasks` repository, and `ProjectAccessPort` adapter
- `src/modules/projects/access/` — `ProjectAccessPort` + adapter over `ProjectsRepository` using existing owner authorization
- `src/modules/tasks/domain/` — Task entity, status/priority/due date, title rules, defaults, immutable `projectId`, soft-delete
- `src/modules/tasks/dto/`, `validators/`, `repository/`, `service/`, `controller/`, `routes/`, `tests/`

**frontend/**

- `src/api/client.ts`, `src/api/types.ts` — task DTOs and calls; add DELETE for soft-delete `204`
- `src/tasks/` — list, filters, create, detail/update, soft-delete views and tests
- `src/projects/ProjectDetail.tsx` — render task UI for the selected project
- `src/App.tsx` — keep selected-project switching; no router

**root**

- No new env names expected
- Compose: still three primary services; frontend still never gets `DATABASE_URL`
- Do not add `specs/005-audit/`

Do not create implementation source under `specs/`. Do not add empty `project-members`, Kanban, or audit folders.

## 8. Dependencies and Config

**Already in use (do not replace)**

- React, Vite, TypeScript, Express, Prisma 6, Zod, Vitest, Testing Library, SuperTest, CORS, cookie-parser, argon2, npm, Node.js 22 LTS, PostgreSQL 16

**New dependencies**

- None. A frontend router is not required (Q-016). Do not add a generic repository package, a Kanban/DnD library, or an audit package.

**Environment (names, not values)**

- Existing: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db
- Frontend MUST NOT receive `DATABASE_URL`

Images MUST NOT bake secrets.

## 9. Security and Failures

- Authentication middleware: unchanged; attach actor user id or throw `UNAUTHENTICATED`.
- Tasks service: call `ProjectAccessPort.requireOwnedProject(actorId, projectId)` before create/list; for get/update/soft-delete, load the task then, if missing or `deletedAt` is set, throw `TaskNotFoundError` / `NOT_FOUND` before ownership comparison; if live, require ownership of `task.projectId`. Missing project on collection routes → existing `ProjectNotFoundError` / `NOT_FOUND`. Actor not owner of a live resource → existing `ProjectForbiddenError` / `FORBIDDEN` (or an equivalent mapped to `FORBIDDEN`).
- After ownership is confirmed, if the parent snapshot `archivedAt` is set, create/update/soft-delete throw a `tasks` parent-archived error mapped to `CONFLICT` (`409`). GET and list do not throw for archive.
- `403` when the project or a live task’s parent exists and is not owned; `404` when the project (collection) does not exist, or the task (item) does not exist or is deleted.
- Validate at HTTP entry with Zod. Controllers do not touch Prisma.
- Map domain/infrastructure errors in the centralized handler. Do not echo internals.
- DB down: `503` envelope.
- Never return `DATABASE_URL`, hashes, plaintext passwords, session ids in JSON, or stack traces.
- CORS unchanged.
- Do not implement membership checks “for later.”
- Do not add audit logging of CRUD payloads.

## 10. Testing

| Requirement | Test |
| ----------- | ---- |
| System-assigned id/createdAt; title not unique; enumerations; defaults; optional due date; immutable `projectId`; soft-delete | `tasks` domain tests, no HTTP/Prisma |
| Project-owner authorization via port; archived parent writes conflict; deleted is not found | `tasks` service tests with fake task repository and fake `ProjectAccessPort` |
| Create persists `projectId` from path; body cannot set id/createdAt/deletedAt/projectId; defaults apply | SuperTest + persistence |
| Validation 400 for unknown/server-owned fields, empty `title`, invalid status/priority/due date, invalid filters | API tests |
| Duplicate `title` create succeeds | API tests |
| GET own live task 200; other user 403; missing or deleted 404; no cookie 401 | API tests |
| PATCH allowed fields; id/createdAt/projectId immutable | API tests |
| List returns only that project’s non-deleted tasks; empty list 200; filters by status and/or priority | API tests |
| DELETE sets `deletedAt`; `204`; later GET/list hide it; second DELETE 404; row remains | API + persistence |
| Archived parent GET/list 200; create/update/DELETE 409 | API tests |
| Existing health/ready public; probes/auth/profile/projects unchanged | existing SuperTest |
| UI create/list/filter/empty/update/soft-delete loading/success/error/unauthenticated/forbidden/conflict | Testing Library |
| UI fetch uses `credentials: 'include'`; no token storage; no router; no Kanban DnD | frontend tests |
| Secrets not committed; no audit module | repo inspection |

Do not claim tests passed without running them. Destructive DB resets are out of scope unless later authorized.

## 11. Sequence

1. Keep artifacts Draft until spec/plan/tasks are Approved. Do not start implementation in this planning pass.
2. Inspect current modules, error handler, Prisma schema, `createApp`, `UsersIdentityPort` pattern, frontend client, and `ProjectDetail` (T001–T002). Stop if artifacts are not Approved.
3. Add `ProjectAccessPort` and adapter in `projects` without changing project HTTP contracts.
4. Add `tasks` domain (identity, association, title/description, status, priority, defaults, due date, immutable `projectId`, `deletedAt` soft-delete) with tests without HTTP/Prisma.
5. Add Prisma enums + `Task` (`deletedAt`, status/priority defaults) and additive migration; keep existing models; no unique on `title`.
6. Implement repository contract and Prisma adapter; map Prisma → domain inside the adapter; `listByProjectId` excludes deleted and accepts optional filters.
7. Implement service use cases; authorization through the port, not auth middleware; apply Q-024 after the snapshot.
8. Implement DTOs, Zod validators (bodies and list query), error mapping, controllers, nested collection + item routes including DELETE, `app.ts` wiring.
9. Backend tests (domain, service fakes, SuperTest with cookie agent).
10. Frontend API client (including DELETE) and task views via view/state switching inside the selected project; keep profile, project, and probe UI.
11. Frontend tests.
12. Typecheck, targeted tests, AC scenarios on the running stack.
13. Independent review; update `memory.md` from verified results only.

## 12. Risks

- **HTTP DELETE vs hard-delete:** `DELETE /api/tasks/:id` is the soft-delete operation. Implementers MUST set `deletedAt` and MUST NOT issue Prisma `delete`. A mistaken hard-delete would violate Q-022.
- **Deleted existence leak:** compare ownership only after treating `deletedAt` as not found, so non-owners get `404` rather than `403` for deleted ids.
- **Archived parent vs deleted task:** `409` applies only to writes on live tasks of an archived project. Deleted tasks stay `404`.
- **Later membership:** owner-only access will need a new authorized-access rule in a future collaboration spec. Do not pre-build `project-members`.
- **Cross-domain leakage:** querying `Project` from the `tasks` Prisma adapter would violate constitution Article II/III. Use `ProjectAccessPort`.
- **Generic repository temptation:** forbidden. `tasks` has its own repository.
- **Authz folded into middleware:** would violate FR-008. Middleware authenticates; `tasks` service authorizes via the port.
- **Frontend-only checks:** hidden views are not protection.
- **404 vs 403:** `403` when the parent project exists and is not owned, or a live task’s parent is not owned; `404` when the project (collection) or task (item) does not exist or is deleted.
- **Q-016 router pressure:** selected project + selected task state is enough. Do not add a router.
- **Kanban pressure:** status is a field, not a board. Do not add columns or drag-and-drop.
- **Audit pressure:** Q-027 is out of scope. Do not add audit tables or `005-audit` artifacts.
- **Destructive migration:** additive only; no reset/volume delete. FK `onDelete: Restrict` so project rows are not implicitly deleted.
- **Prisma reverse relation on `Project`:** must not leak into the `projects` repository select list.
- **Frontend DELETE gap:** `request()` has no DELETE today; add it for this soft-delete `204`.
- **Empty product modules:** do not scaffold membership, Kanban, or audit.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `tasks` create; `projectId` from path; defaults `TODO`/`MEDIUM` | SuperTest + DB; `201` |
| AC-002 | `requireAuth` on create | API test `401` |
| AC-003 | Zod strict create; required `title`; reject server-owned fields | API test `400` |
| AC-004 | GET by id as project owner; DTO omits `deletedAt` | API test `200` |
| AC-005 | auth middleware on all task routes | API tests `401` |
| AC-006 | service + `ProjectAccessPort` | service + API `403` |
| AC-007 | missing project/task → `NOT_FOUND` | API test `404` |
| AC-008 | PATCH allowed fields; identity and `projectId` immutable | API + persistence |
| AC-009 | `listByProjectId` excludes other projects and deleted rows | API test two users / two projects |
| AC-010 | list without cookie | API test `401` |
| AC-011 | Zod + domain enumerations | API + domain tests |
| AC-012 | DTO mapping and error handler | API body inspection |
| AC-013 | module layout, port, mapping | review + tests without Prisma types in DTOs |
| AC-014 | tasks UI inside project detail, no router, no Kanban | Testing Library + Compose check |
| AC-015 | documented test commands | executed checks |
| AC-016 | existing auth/system/project routes | existing SuperTest |
| AC-017 | duplicate `title` allowed | API tests |
| AC-018 | optional calendar due date | API + persistence |
| AC-019 | `DELETE` sets `deletedAt`; later GET/list `404`/omit; no restore | API + persistence |
| AC-020 | list query `status` and/or `priority` | API tests |
| AC-021 | archived parent GET/list `200`; writes `409` | API tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved to execute tasks: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
