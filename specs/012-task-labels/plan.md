# Implementation Plan: Task Labels

- **Feature ID:** 012-task-labels
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Spec section 15 questions **Q-080–Q-093** are **Decided** (option **1** each). Locked constraints: per-project catalog; many labels per task; card-face display; filter by label; no checklists (**F**); no `specs/005-audit/`; no constitution changes; additive Prisma only; reuse `TaskAuthorizationPort`; keep Verified comments and activity public contracts intact; **no** activity emission for labels (Q-089).

Technical shape below matches Decided Q-080–Q-093. Implementation may proceed on T001–T017 only.

## 1. Summary

Add **per-project labels / tags** (proposed backlog **E**) so authorized members can maintain a project label catalog, assign many labels to a task, see labels on the Kanban card face, and filter the project task list by label.

Decided approach:

- Own catalog + assignment inside existing **`tasks`** domain (Q-080), not a peer `labels` product domain and not app-wide audit.
- Persist `ProjectLabel` + `TaskLabel` join via additive Prisma models + versioned migration; Prisma stays behind `tasks` repositories.
- Catalog HTTP under `/api/projects/:projectId/labels`; assignment via `PUT /api/tasks/:taskId/labels` replace-set (Q-086).
- Authorize catalog/assignment writes with `requireTaskWrite` (Q-081 / Q-082); list/filter/read with `requireTaskRead`.
- Extend `PublicTaskDto` with `labels: [{ id, name, color }]` (Q-087) — documented necessary task DTO extension for card face.
- Extend list query with optional single `labelId` (Q-088), AND-composed with existing `status`/`priority`.
- No activity emission for label changes (Q-089); comments routes unchanged.
- Frontend: board-header Labels Dialog (Q-090), TaskDetail assignment, card-face chips, filter control; no checklists.
- Color: required fixed named tokens (Q-083); name unique after trim case-insensitive (Q-084); hard-delete + join cleanup (Q-085); PATCH name and/or color (Q-091); name 1–40, no count caps (Q-092); archived mutate same as task writes (Q-093).

## 2. Current State

Inspected 2026-11-05. `001-foundation` through `011-task-activity` are Verified. Draft `specs/012-task-labels/` exists. No label Prisma models yet.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks`, `project-members` under `backend/src/modules/`
- Prisma: `User`, `Project`, `ProjectMember`, `Task` (`deletedAt`, status, priority, dueDate), `TaskComment`, `TaskActivityEvent`
- Migrations through `20261104210000_task_activity`
- `TaskAuthorizationPort`: `requireTaskRead`, `requireTaskWrite`, `requireProjectOwner`
- Task HTTP: `POST/GET /api/projects/:projectId/tasks` (optional `status`/`priority` query); `GET/PATCH/DELETE /api/tasks/:id`
- `PublicTaskDto`: `id`, `projectId`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt` — **no labels**
- Frontend: `TasksPanel` filters (status/priority), `KanbanBoard` card face (title, priority, due date), `TaskDetail` Dialog (fields, comments, activity)
- Error envelope codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`

Absent:

- Label catalog / join tables, repositories, routes, UI, list `labelId` filter

Limitations to respect:

- Do not implement **F** or **C**; do not write `specs/005-audit/`
- Do not reset the database or delete volumes
- Do not change public comments contracts
- Do not change activity public contract/kinds; do not emit label activity events
- Soft-deleted tasks → `404` on item ops
- `tasks` MUST NOT import other domains’ Prisma repositories

## 3. Domain Boundaries

- Owning domain (Q-080): **`tasks`** — label catalog invariants, assignment invariants, repositories, use cases, HTTP for labels, task DTO label embedding, list filter by label
- Other domains:
  - `project-members` — `TaskAuthorizationPort` only; no new role names
  - `auth` — session middleware only
  - `projects` / `users` / `system` — unchanged unless a narrow existing port is already used for project existence (prefer authz port snapshots)
- Invariants:
  - Label `id` / `createdAt` system-assigned
  - `projectId` immutable on catalog label
  - Assignment only within same `projectId` as task
  - Many-to-many; unique join `(taskId, labelId)`
  - Name uniqueness case-insensitive after trim within project (Q-084); required fixed color token (Q-083); hard-delete + join cleanup (Q-085); name 1–40 (Q-092); PATCH name and/or color (Q-091)
- Cross-domain interfaces (acyclic):
  - Label use cases depend on `TaskAuthorizationPort` + tasks/label repositories
  - No comments/activity public contract changes; no label activity events (Q-089)
  - `project-members` MUST NOT import label persistence
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / ports.
- Layout: extend `backend/src/modules/tasks/` with label domain/repo/service/dto/validators/controller/routes/tests. Do not invent peer `labels` or `audit` modules.

## 4. API Contract

Reuse existing error envelope and codes. Paths below match Decided Q-080 / Q-086 / Q-087 / Q-088.

### Fixed color tokens (Q-083)

Required `color` MUST be one of:

`RED` | `ORANGE` | `YELLOW` | `GREEN` | `TEAL` | `BLUE` | `PURPLE` | `PINK` | `GRAY`

Zod enum at HTTP boundary; same set in domain. No freeform hex.

### Catalog — list

- `GET /api/projects/:projectId/labels`
- Auth: session + `requireTaskRead`
- Response: `{ labels: PublicLabelDto[] }` ordered by name ascending (stable educational default)
- Errors: `401`, `403` (existing project, non-member), `404` (missing project)
- Archived parent: list still allowed under task-read rules (Q-093)

### Catalog — create

- `POST /api/projects/:projectId/labels`
- Auth: session + `requireTaskWrite` (Q-081)
- Body: `{ name: string, color: <token enum> }`
- Success: `201` `{ ...PublicLabelDto }`
- Errors: `400`, `401`, `403`, `404`, `409` (duplicate name case-insensitive), archived per Q-093 (`409`/`403`)

### Catalog — update

- `PATCH /api/projects/:projectId/labels/:labelId` (Q-091)
- Auth: session + `requireTaskWrite`
- Body: optional `name` and/or `color` only
- Success: `200` PublicLabelDto
- Errors: `400`, `401`, `403`, `404`, `409`, archived per Q-093

### Catalog — delete

- `DELETE /api/projects/:projectId/labels/:labelId`
- Auth: session + `requireTaskWrite`
- Behavior: hard-delete label + remove join rows (Q-085); `204`
- Errors: `401`, `403`, `404`, archived per Q-093

### Task assignment — replace set

- `PUT /api/tasks/:taskId/labels`
- Auth: session + `requireTaskWrite` on parent project (Q-082)
- Body: `{ labelIds: string[] }` (empty array clears all)
- Rules: every id MUST exist in the parent project catalog; canonicalize to a unique order-preserving set (duplicates collapsed, not rejected)
- Success: `200` `{ labels: PublicLabelDto[] }` (resulting set); board refresh relies on task list/get embedding
- Errors: `400`, `401`, `403`, `404` (missing/soft-deleted task or unknown label id), archived per Q-093

### Task list filter extension

- `GET /api/projects/:projectId/tasks?status&priority&labelId`
- Optional `labelId` (UUID) (Q-088); AND with status/priority when present
- Unknown query keys still `400`
- Auth unchanged (`requireTaskRead`)

### PublicTaskDto extension (Q-087)

```
{
  id, projectId, title, description, status, priority, dueDate, createdAt,
  labels: Array<{ id: string, name: string, color: string }>
}
```

Apply on create/get/list/update task responses. Empty array when none assigned.

### PublicLabelDto

```
{ id: string, projectId: string, name: string, color: string, createdAt: string }
```

Card-face / task embedding uses `{ id, name, color }` only (omit `projectId`/`createdAt`).

### Unchanged contracts

- Comments: all Verified `010` paths/DTOs/statuses
- Activity: Verified `GET /api/tasks/:taskId/activity` and kinds (Q-089: no label events)
- Membership, dashboard, auth, health/ready

## 5. Persistence

- Additive Prisma:
  - `ProjectLabel` / `project_labels`: `id` uuid PK, `projectId` FK → Project Restrict, `name` string (display, trimmed), `nameKey` string (lowercased uniqueness key), `color` string (token), `createdAt`; unique `(projectId, nameKey)`
  - `TaskLabel` / `task_labels`: `taskId` FK → Task Restrict, `labelId` FK → ProjectLabel Cascade (join removed when label hard-deleted), `createdAt`; unique `(taskId, labelId)`; indexes on `taskId`, `labelId`
  - Do **not** add checklist or app-wide audit tables
- Migration: versioned under `backend/prisma/migrations/`. `prisma migrate deploy` only. No reset. No volume delete.
- Repository contracts (owning domain):
  - Label catalog: create, listByProjectId, update, delete, findByIdInProject
  - Assignments: replaceSetForTask, listForTaskIds (batch for task list embedding), deleteByLabelId (if Cascade not sufficient for domain tests)
  - Extend tasks list filter to accept optional `labelId`
  - In-memory fakes for tests
- Transactions: replace-set and catalog delete+join cleanup in one infrastructure transaction
- Compatibility: existing tasks get empty `labels: []`; forward-only; no backfill of synthetic labels

## 6. Frontend

- API client helpers: catalog CRUD, PUT task labels, listTasks accepts `labelId`; credentials include
- `TasksPanel`: add label filter control beside status/priority; pass `labelId` query
- `KanbanBoard` / card face: render assigned label name + color token (compact chips/text — not a new card redesign)
- `TaskDetail`: assignment UI for `canWrite` (multi-select/toggle from project catalog); VIEWER read-only
- Board header: Labels Dialog for catalog CRUD (Q-090), similar density to Members Dialog; no Members redesign
- Loading/empty/error/401/403/404/409 states as applicable
- No checklists UI; no new route; no bearer token; no new CSS framework; no required new npm dependency (prefer existing button/dialog/input)

## 7. Files

Expected files (adjust names to module conventions during implementation):

- `backend/prisma/schema.prisma` — additive label + join models
- `backend/prisma/migrations/<timestamp>_task_labels/` — additive migration
- `backend/src/modules/tasks/domain/` — label entity/errors/color catalog
- `backend/src/modules/tasks/repository/` — label + assignment repos + Prisma adapters + extend tasks repo filter/embedding
- `backend/src/modules/tasks/service/` — labels service + tasks service list/DTO mapping updates
- `backend/src/modules/tasks/{dto,validators,controller,routes}` — catalog + assignment HTTP; extend list-tasks query + task DTOs
- `backend/src/app.ts` / composition root — wire routers/repos
- `backend/src/modules/tasks/tests/` — domain/service/API tests for ACs
- `frontend/src/api/client.ts` (+ types/tests) — label helpers + list query
- `frontend/src/tasks/TasksPanel.tsx`, `KanbanBoard.tsx`, `TaskDetail.tsx` (+ tests)
- `frontend/src/tasks/` or projects board header — Labels Dialog component (+ tests)

Do not add `specs/005-audit/`. Do not add checklist modules.

## 8. Dependencies and Config

- New packages: none expected
- New env vars: none expected
- Docker: no Compose service changes

## 9. Security and Failures

- Session + `TaskAuthorizationPort` on every label route and existing task list
- Validate UUIDs, name length 1–40, color token enum, labelIds array; reject unknown fields
- Envelope errors; no secrets in responses
- Archived parent: Q-093 same as task writes (`ownerUserId` → `409`; other members → `403`; reads allowed)
- Cross-project assignment impossible by validation against parent `projectId`

## 10. Testing

- Domain: name trim/uniqueness key, color token set, same-project assignment invariant, replace-set, name length
- Service: catalog CRUD authz matrix; assignment authz; filter AND composition; delete removes joins; archived/soft-delete paths; no activity emission
- Repository/persistence (when `DATABASE_URL` set): unique constraints; ordered list; filter by labelId
- API SuperTest: AC-001–AC-009, AC-011–AC-015; comments/activity contract smoke unchanged; task DTO includes `labels`
- Frontend Testing Library: card face labels; filter query param; TaskDetail assign chrome; Labels Dialog; credentials; no checklists/Trello branding

## 11. Sequence

1. User **Approves** artifacts (done). Q-080–Q-093 already Decided.
2. Inspect current tasks/Kanban/authz wiring (T001).
3. Domain + repository contracts + in-memory fakes.
4. Prisma models + additive migration + adapters; extend task list filter + DTO mapping.
5. Catalog + assignment services, validators, controllers, routes.
6. Backend tests.
7. Frontend API + card face + filter + TaskDetail + Labels Dialog + tests.
8. Typecheck/tests; AC verification; independent review; memory update (propose `implemented-features.md` only with user confirmation).

## 12. Risks

- **Task DTO extension (Q-087)** — intentional contract change; must stay additive and tested across create/get/list/update.
- **Case-insensitive uniqueness** — `name` vs `nameKey` strategy must stay consistent in domain + DB unique index.
- **N+1 label loading** — batch assignment fetch for list embedding required in repository layer.
- **Card-face density** — many labels may crowd compact cards; keep presentation minimal (name + color token).
- **Approval gate** — Cleared; artifacts Approved.
- **Checklist pressure (F)** — do not sneak checklist fields into this folder.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Catalog create use case + route | SuperTest + service |
| AC-002, AC-003 | Assignment replace-set | SuperTest + service |
| AC-004, AC-010 | Card face + Dialog + filter UI | Frontend tests |
| AC-005 | List query `labelId` | SuperTest + frontend filter |
| AC-006, AC-007 | Authz matrix | SuperTest |
| AC-008 | Delete + join cleanup | SuperTest |
| AC-009 | No comments/activity/F/C drift | Regression + scope check |
| AC-011 | Zod validators | SuperTest |
| AC-012, AC-013 | Archived + soft-delete | SuperTest |
| AC-014, AC-015 | Migration + boundaries | migrate deploy + tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes — recorded above
- Approved for task breakdown: Yes
- Approved for implementation: Yes
