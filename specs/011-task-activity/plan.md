# Implementation Plan: Task Activity

- **Feature ID:** 011-task-activity
- **Specification:** `spec.md`
- **Status:** Draft

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Draft**. Q-066–Q-079 in `spec.md` section 15 are **Decided**. Do not invent further product rules. Do not implement labels (**E**). Do not write `specs/005-audit/`. Do not change `constitution.md`. Do not implement until Approved.

## 1. Summary

Add **task-scoped activity** (proposed backlog **L**) so authorized readers can list a persisted history of Decided event kinds: task created, task field changes, task soft-delete, and comments added.

Technical approach (aligned to Decided Qs):

- Own activity inside existing **`tasks`** domain (Q-067), mirroring comments — not a new peer product domain and not app-wide audit.
- Persist events via an additive Prisma model + versioned migration; Prisma stays behind a `tasks` activity repository.
- Emit events as **internal side effects** of successful `TasksService.create` / `update` / `softDelete` and `CommentsService.create`. Same infrastructure transaction as the write; fail the write if event insert fails (Q-077).
- Expose **read-only** `GET /api/tasks/:taskId/activity` returning `{ activity: [...] }` (Q-079). No public activity write routes.
- Authorize list with `TaskAuthorizationPort.requireTaskRead` (Q-068).
- Field changes: one event per successful PATCH with actual changes; payload = field names + old/new for changed fields only; no emit on no-op (Q-070–Q-072).
- Comment-added payload: `commentId` + short body preview (Q-075).
- Actor display name resolved at list time via `UsersIdentityPort` (Q-076).
- List: newest `createdAt` first; full list; no pagination; forward-only history (Q-073, Q-074, Q-078).
- Keep Verified comments HTTP contracts unchanged; comment-added emission is internal only (FR-008).
- Frontend: read-only section in existing `TaskDetail` Dialog; no new route; no board-card strip (Q-069).

This is **not** proposed **C** (app-wide CRUD audit). Overlap: Q-066 Decided — separate later feature; no `specs/005-audit/`.

## 2. Current State

Inspected 2026-11-04. `001-foundation` through `010-task-comments` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks`, `project-members` under `backend/src/modules/`
- Prisma: `User`, `Project`, `ProjectMember`, `Task` (`deletedAt`, `title`, `description`, `status`, `priority`, `dueDate`), `TaskComment` (`deletedAt`)
- Migrations through `20261104180000_task_comments`
- `TasksService`: `create`, `listByProject`, `getById`, `update`, `softDelete`, `getDashboard` — all task item writes via `TaskAuthorizationPort.requireTaskWrite` / reads via `requireTaskRead`
- `CommentsService.create` via `requireTaskWrite`; public routes `POST/GET /api/tasks/:taskId/comments`, `PATCH/DELETE .../comments/:commentId`
- `UsersIdentityPort.findById` for comment `authorDisplayName`
- Task HTTP: `POST/GET /api/projects/:projectId/tasks`; `GET/PATCH/DELETE /api/tasks/:id`
- Mutable task fields on PATCH: `title`, `description`, `status`, `priority`, `dueDate`
- Error envelope codes: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`
- Frontend: `TaskDetail` Dialog with task load/save/soft-delete and comments; API client `credentials: 'include'`

Absent:

- Activity / task-event Prisma model, migration, repository, list route, UI section
- Emission hooks on task create/update/soft-delete and comment create

Limitations to respect:

- Follow Decided scope kinds and Q-066–Q-079 only
- Do not implement **E** or **C**; do not write `specs/005-audit/`
- Do not reset the database or delete `pgdata`
- Do not change public comment DTO/path/status contracts
- Soft-deleted tasks map to `404` on task item and comment routes; activity list MUST match
- `tasks` MUST NOT import other domains’ Prisma repositories
- No empty `audit` module; no peer `activity` product domain (Q-067)

## 3. Domain Boundaries

- Owning domain: **`tasks`** (Q-067) — activity identity, task association, actor binding, Decided kinds, newest-first list order, emission from task/comment use cases, activity repository
- Other domains:
  - `project-members` — `TaskAuthorizationPort.requireTaskRead` for list (Q-068); no new role matrix
  - `users` — `UsersIdentityPort.findById` for actor display name at list time (Q-076)
  - `auth` — session middleware only
  - `projects` — unchanged
  - `system` — unchanged
- Invariants:
  - Event id and `createdAt` system-assigned
  - `taskId` immutable; taken from the triggering aggregate
  - `actorUserId` = authenticated writer; not client-supplied
  - Kinds limited to Decided set
  - One field-change event per successful mutating PATCH; no emit on no-op
  - No client forge/update/delete API
  - Soft-deleted / missing task → not found for list
  - Comment PATCH/soft-delete do not emit
  - Forward-only; no backfill
- Cross-domain interfaces (acyclic):
  - List use case depends on `TaskAuthorizationPort` + tasks repository (resolve live task / `projectId`) + activity repository + `UsersIdentityPort`
  - Emission stays inside `tasks` services (tasks + comments) calling the activity repository; no HTTP from services
  - Same-transaction unit spanning task/comment write + activity insert (Q-077)
  - `tasks` MUST NOT import other domains’ Prisma repositories
  - `project-members` / `users` MUST NOT import activity persistence
  - `auth` MUST NOT authorize activity
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / ports. Prisma adapters implement repositories.
- Layout: extend `backend/src/modules/tasks/` with activity-specific domain/repo/service/dto/validators/controller/routes/tests. Do not invent a peer `activity` or `audit` product module.

## 4. API Contract

Reuse the existing error envelope. Reuse `VALIDATION_ERROR` `400`, `UNAUTHENTICATED` `401`, `FORBIDDEN` `403`, `NOT_FOUND` `404`, `CONFLICT` `409`. Do not invent a new error code for this feature.

### List (Q-079)

- Method and path: `GET /api/tasks/:taskId/activity`
- Auth: valid session cookie required
- Request DTO: none (path `:taskId` only)
- Response DTO:

```
{
  activity: Array<{
    id: string,
    taskId: string,
    kind: "TASK_CREATED" | "TASK_FIELDS_CHANGED" | "TASK_SOFT_DELETED" | "COMMENT_ADDED",
    actorUserId: string,
    actorDisplayName: string,
    createdAt: string,
    payload: object
  }>
}
```

Payload by kind (Decided):

- `TASK_CREATED`: empty object `{}` (or equivalently no extra fields)
- `TASK_FIELDS_CHANGED`: `{ changes: Array<{ field: "title"|"description"|"status"|"priority"|"dueDate", oldValue: ..., newValue: ... }> }` for changed fields only (Q-070, Q-071). Value types match Verified task field JSON (strings / null for dueDate as today).
- `TASK_SOFT_DELETED`: empty object `{}`
- `COMMENT_ADDED`: `{ commentId: string, bodyPreview: string }` — short preview of the comment body (Q-075)

- Validation: path UUID `:taskId` as existing task routes
- Success: `200` with full collection, newest `createdAt` first (Q-073, Q-078); possibly empty
- Error cases:
  1. Invalid session → `401`
  2. Unknown or soft-deleted `:taskId` → `404` for every caller
  3. Live task whose parent the actor is not authorized to read → `403`

### Writes

- No `POST` / `PATCH` / `DELETE` activity routes in this feature.

### Unchanged contracts

- Task create/update/soft-delete HTTP stay as Verified; emission is internal.
- Comments HTTP stay as Verified (`010-task-comments`); emission on create is internal. No public comments contract extension.

## 5. Persistence

- Prisma model changes (additive):
  - Model e.g. `TaskActivityEvent` mapped to e.g. `task_activity_events`
  - Fields: `id` (uuid), `taskId` (uuid FK → Task, Restrict), `actorUserId` (uuid FK → User, Restrict), `kind` (enum or constrained string for the four Decided kinds), `payload` (JSON), `createdAt`
  - Index on `taskId` and `(taskId, createdAt)` for ordered list
  - Do **not** add app-wide audit tables spanning projects/members/auth
  - Do **not** add label tables
- Migration: versioned additive under `backend/prisma/migrations/`. `prisma migrate deploy` only. No reset. No volume delete.
- Repository contract (owning domain):
  - `create(event)` — persist one event
  - `listByTaskId(taskId)` — all events for task, newest `createdAt` first
  - In-memory fake for tests
- Transactions: wrap triggering write + `create` event in one infrastructure transaction via composition-root / unit-of-work helper; do not put Prisma in domain (Q-077). Fail write if event insert fails.
- Compatibility: existing task and comment rows unchanged; activity optional; empty list when none exist; forward-only history (Q-074).

## 6. Frontend

- Add API client helper: list activity for `taskId` with `credentials: 'include'`.
- Extend `TaskDetail` with a read-only activity section (Q-069): loading / empty / success / error / 401 / 403 / 404 as applicable. No new route; no board-card strip.
- Render kind + actor display name + time + payload summary (field changes and comment preview); plain text; no Markdown requirement.
- Do not redesign board, Members Dialog, Kanban, dashboard, or comments controls beyond inserting the activity section.
- No labels UI. No new npm dependency. No bearer token storage.

## 7. Files

Expected files and responsibilities (adjust names to match module conventions during implementation):

- `backend/prisma/schema.prisma` — additive activity model + enum
- `backend/prisma/migrations/<timestamp>_task_activity/` — additive migration
- `backend/src/modules/tasks/domain/` — activity entity / kinds / field-diff helpers / errors as needed
- `backend/src/modules/tasks/repository/activity-repository.ts` (+ Prisma adapter + in-memory fake)
- `backend/src/modules/tasks/service/tasks-service.ts` — emit on create/update/softDelete (transactional)
- `backend/src/modules/tasks/service/comments-service.ts` — emit on create only (transactional)
- `backend/src/modules/tasks/service/` — list activity use case (dedicated service or extension)
- `backend/src/modules/tasks/{dto,validators,controller,routes}` — list activity HTTP
- `backend/src/app.ts` / composition root — wire repository, transactions, router
- `backend/src/modules/tasks/tests/` — domain/service/API tests for ACs
- `frontend/src/api/client.ts` (+ types/tests) — list helper
- `frontend/src/tasks/TaskDetail.tsx` (+ tests) — activity section

Do not add `specs/005-audit/`. Do not add frontend label modules.

## 8. Dependencies and Config

- New packages: none expected.
- New env vars: none expected.
- Docker: no Compose service changes; reuse `frontend`, `backend`, `db`.

## 9. Security and Failures

- List: session + `requireTaskRead`; soft-deleted/missing task → `404` for all callers.
- Emission actor from session of the write use case only.
- Envelope errors; no secrets in responses; omit internal Prisma fields.
- Archived parent: reuse Verified task-read authorization behavior; do not invent a new matrix.
- Emission failure: fail the write if event insert fails inside the same transaction (Q-077).

## 10. Testing

- Domain: event kinds, actor binding, field-diff / no-op, no client forge invariants.
- Service: create/update/softDelete/comment create emit; comment PATCH/soft-delete do not; no-op PATCH no emit; transactional failure path; authz list; newest-first; full list.
- Repository / persistence (when `DATABASE_URL` present): create + ordered list.
- API SuperTest: AC-001–AC-008, AC-011, AC-013–AC-016; 401/403/404; no secrets; comments contract regression on create response shape; `{ activity: [...] }` wrapper.
- Frontend Testing Library: TaskDetail shows activity section; credentials include; empty/error states; no labels UI; no new route.

## 11. Sequence

1. User Approves Draft artifacts (material Qs already Decided).
2. Inspect current tasks/comments wiring (T001).
3. Domain kinds + field-diff helpers + repository contract + in-memory fake.
4. Prisma model + additive migration + adapter.
5. Wire emission into tasks/comments services with same-transaction policy (Q-077).
6. List use case + DTOs/validators/controller/routes (`GET .../activity`).
7. Backend tests.
8. Frontend API helper + TaskDetail UI + tests.
9. Typecheck/tests; AC verification; independent review; memory update (propose `implemented-features.md` only with user confirmation).

## 12. Risks

- **Approval gate** — Draft until user Approves; implementation blocked until then.
- **Overlap with C** — mitigated by Q-066 Decided; risk of implementers building a generic audit — reject in review.
- **Comment contract drift** — emission must stay internal; regression-test comment create response.
- **Transaction complexity** — Prisma transaction across task write + activity insert must not leak Prisma into domain; use composition-root/unit-of-work carefully.
- **Body preview length** — “short” preview for Q-075 should truncate consistently in domain/DTO mapping without inventing rich text.
- **Label pressure (E)** — do not sneak label fields onto cards.
- Alternatives considered: peer `activity` domain (rejected Q-067); app-wide audit table now (rejected Q-066); emitting comment edit/delete (rejected by Decided scope); pagination (rejected Q-078); backfill (rejected Q-074).

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | TasksService.create emit | Service + SuperTest |
| AC-002 | TasksService.update emit (one event, old/new) | Service + SuperTest |
| AC-003 | softDelete emit + list 404 | Service + SuperTest |
| AC-004 | CommentsService.create emit (commentId + preview); no edit/delete emit | Service + comments regression |
| AC-005 | list authz + empty `{ activity: [] }` | SuperTest |
| AC-006 | missing/deleted task | SuperTest |
| AC-007 | no write routes | Route inventory / SuperTest |
| AC-008 | actor attribution at list time | SuperTest |
| AC-009 | scope boundaries | Review + regression |
| AC-010 | TaskDetail UI section | Frontend tests |
| AC-011 | additive migration | Migration review |
| AC-012 | Draft/Approve gate | Approval gate |
| AC-013 | ports / tasks ownership / no generic repo | Architecture review + tests |
| AC-014 | no-op PATCH no emit | Service tests |
| AC-015 | same-tx fail write | Service / persistence tests |
| AC-016 | newest first; full list | SuperTest |

## 14. Approval

- Specification reviewed: No (Draft; Qs Decided)
- Architecture reviewed: No (Draft; awaiting user Approve)
- Risks understood: Yes (recorded)
- Approved for task breakdown: No (tasks are Draft planning aids only)
- Approved for implementation: No
