# Implementation Plan: Task Comments

- **Feature ID:** 010-task-comments
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Verified**. Q-058–Q-061 are **Decided** in `spec.md` section 15. Do not invent mentions, rich text, checklists, assignees, attachments, or audit tables. Do not implement card activity (**L**) or labels (**E**). Do not change `constitution.md`. Do not write `specs/005-audit/`.

## 1. Summary

Add task comments as a subordinate resource inside the existing `tasks` domain so authorized project members can create and list persisted discussion on a non-deleted task, authors can edit their own comment body, and authors or project OWNER can soft-delete comments.

Reuse verified session cookie auth, Zod boundary validation, error envelope, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and Vitest + Testing Library + SuperTest.

Authorization:

- **Create** — `TaskAuthorizationPort.requireTaskWrite` (OWNER/EDITOR / `ownerUserId` grant)
- **List** — `TaskAuthorizationPort.requireTaskRead` (OWNER/EDITOR/VIEWER / `ownerUserId` grant)
- **Edit (`PATCH`)** — author-only (`authorUserId === actor`); non-authors `403`
- **Soft-delete (`DELETE`)** — author **or** effective project OWNER (OWNER role or `ownerUserId` grant); else `403`

Author is the session actor at create; public DTO includes `authorDisplayName` via `UsersIdentityPort`. Body is plain text only (Q-061). No mention parsing (Q-060).

Persistence is an additive Prisma model `TaskComment` with nullable `deletedAt` and a versioned migration under `backend/prisma/`. Prisma stays behind the `tasks` comment repository.

HTTP under the task:

- `POST` / `GET /api/tasks/:taskId/comments`
- `PATCH` / `DELETE /api/tasks/:taskId/comments/:commentId` (DELETE soft-deletes; `204`; no restore)

Frontend: comments section inside the existing `TaskDetail` Dialog (list, create when `canWrite`, edit own, soft-delete for author or OWNER chrome).

Do not implement activity feeds, labels, assignees, attachments, checklists, voting, notifications, or audit tables.

## 2. Current State

Inspected 2026-11-04. `001-foundation` through `009-collaboration` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks`, `project-members` under `backend/src/modules/`
- Prisma: `User`, `Project`, `ProjectMember`, `Task` (`deletedAt`, status, priority, `dueDate`). No comment model.
- Migrations through `20261031120000_project_members`
- `TasksService` authorizes every use case via `TaskAuthorizationPort` (`requireTaskRead` / `requireTaskWrite`)
- `UsersIdentityPort` exposes `findById` / `findByEmail` (`id`, `email`, `displayName`)
- Task HTTP: `POST/GET /api/projects/:projectId/tasks`; `GET/PATCH/DELETE /api/tasks/:id`
- Error envelope codes already include `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`
- Frontend: `TaskDetail` Dialog with load/save/soft-delete and `canWrite`; API client uses `credentials: 'include'`
- Copied shadcn `textarea`, `button`, `dialog` available
- Effective OWNER resolution already exists in `project-members` domain (`resolveEffectiveRole` / `ownerUserId` grant)

Absent:

- Comment Prisma model / migration / repository / routes / UI
- Port method for OWNER check used by comment soft-delete (extend existing port or additive sibling; do not invent a new role matrix)

Limitations to respect:

- Follow Q-058–Q-065 Decided answers
- Do not implement **L** or **E** in this folder
- Do not reset the database or delete `pgdata`
- Do not change public task/project DTO field sets to embed comments or labels
- Soft-deleted tasks already map to `404` on task item routes; comment routes MUST match that rule
- Soft-deleted comments MUST map to omit-from-list and `404` on item ops (same pattern as tasks)
- Archived non-owner members already get `403` on task ops; comment ops MUST match
- `tasks` MUST NOT import `prisma-project-members-repository` or `prisma-users-repository`

## 3. Domain Boundaries

- Owning domain: **`tasks`** (comment identity, task association, author binding, body invariant, list order, soft-delete via `deletedAt`, author-only edit, comment use cases, comment repository)
- Other domains:
  - `project-members` — `TaskAuthorizationPort` for create/list; narrow OWNER check for soft-delete (extend port or additive sibling); no comment policy matrix beyond Decided rules
  - `users` — `UsersIdentityPort.findById` for author display name
  - `auth` — session middleware only
  - `projects` — unchanged
  - `system` — unchanged
- Invariants:
  - Comment id and `createdAt` system-assigned
  - `taskId` immutable; taken from path
  - `authorUserId` = authenticated actor at create; not client-supplied
  - `body` required, non-empty after trim; plain text
  - `deletedAt` null means live; set on soft-delete; never cleared by an API
  - Many comments per task; no body uniqueness
  - List oldest `createdAt` first among live comments
  - Soft-deleted / missing task → not found for comment ops
  - Soft-deleted / missing / wrong-task comment → not found for item ops
  - Create requires task-write; list requires task-read
  - Edit requires author; soft-delete requires author or effective OWNER
  - No mentions / rich text
- Cross-domain interfaces (acyclic):
  - Create/list use cases depend on `TaskAuthorizationPort` and the existing task repository (or equivalent) to resolve task existence / `projectId` / `deletedAt`
  - Soft-delete use case depends on a narrow OWNER capability from `project-members` (recommended: extend `TaskAuthorizationPort` with `requireProjectOwner` **or** return enough snapshot + membership data via an additive method that reuses `resolveEffectiveRole`; do not widen into a generic authz kitchen sink)
  - Edit use case checks authorship after resolving live comment + live task; archived parent rules still apply using project snapshot (`ownerUserId` / `archivedAt`)
  - Comment responses depend on `UsersIdentityPort.findById` for `authorDisplayName`
  - `tasks` MUST NOT import other domains’ Prisma repositories
  - `project-members` and `users` MUST NOT import comment persistence
  - `auth` MUST NOT authorize comments
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / ports. Prisma adapters implement repositories.
- Controller, service, repository, DTOs, routes, validators, domain objects: extend `backend/src/modules/tasks/` (comment-specific files under the same module layout; do not invent a peer `comments` product domain).

Suggested additions under tasks:

- `backend/src/modules/tasks/domain/` comment entity + errors (including soft-delete)
- `backend/src/modules/tasks/repository/` comment repository contract + Prisma adapter (+ in-memory fake for tests)
- `backend/src/modules/tasks/service/` comment use cases (create, list, updateBody, softDelete)
- `backend/src/modules/tasks/{dto,validators,controller,routes}` for comment HTTP
- `backend/src/modules/tasks/tests/` comment unit/API tests

Do not add empty `activity`, `labels`, `audit`, or `notifications` modules.

## 4. API Contract

Reuse the existing error envelope. Reuse `VALIDATION_ERROR` `400`, `UNAUTHENTICATED` `401`, `FORBIDDEN` `403`, `NOT_FOUND` `404`, `CONFLICT` `409`. Do not invent a new error code.

Public comment DTO (success bodies). **Do not include `deletedAt`:**

```
{
  id: string,
  taskId: string,
  authorUserId: string,
  authorDisplayName: string,
  body: string,
  createdAt: string
}
```

`createdAt` is ISO-8601 datetime. Never password, hash, session id, Prisma metadata, nested user objects, or `deletedAt`. Do not require `authorEmail` in this DTO. No `updatedAt` in this feature.

List wrapper: `{ comments: PublicCommentDto[] }`. Order: oldest `createdAt` first among live comments. Soft-deleted parent tasks never expose comments via HTTP. Soft-deleted comments never appear in the list.

All comment routes: valid session cookie required.

Authorization/not-found order:

**Collection (`POST`/`GET .../comments`)** — align with task item routes:

1. Invalid session → `401`
2. Unknown or soft-deleted `:taskId` → `404` for every caller
3. Live task whose parent the actor is not authorized to read/write as required → `403`
4. Authorized create whose parent project is archived → `409` (`ownerUserId`); non-owner members on archived → `403` at step 3

**Item (`PATCH`/`DELETE .../comments/:commentId`)**:

1. Invalid session → `401`
2. Unknown or soft-deleted `:taskId` → `404` for every caller
3. Unknown comment, soft-deleted comment, or comment whose `taskId` ≠ path `:taskId` → `404` for every caller
4. Live comment + live task: edit when actor ≠ author → `403`; soft-delete when actor is neither author nor effective OWNER → `403`
5. Otherwise allowed mutation whose parent project is archived → `409` for `ownerUserId`; non-`ownerUserId` members → `403` (same archived member rule as task writes)

### `POST /api/tasks/:taskId/comments` (protected)

- Auth: valid session cookie
- Who: task-write (OWNER / EDITOR / `ownerUserId` grant)
- Request DTO: `{ body: string }`
- Validation: `body` required, non-empty after trim; `:taskId` UUID or `400`; reject `id`, `createdAt`, `authorUserId`, `taskId`, `deletedAt`, unknown fields (`strict` Zod)
- Behavior: persist comment with `authorUserId = actor`, `deletedAt` null; resolve `authorDisplayName` for response
- Response DTO: public comment DTO
- Success: `201`
- Errors: `400`; `401`; `403`; `404` unknown/deleted task; `409` archived parent when otherwise writable; `503`; `500`

### `GET /api/tasks/:taskId/comments` (protected)

- Auth: valid session cookie
- Who: task-read (OWNER / EDITOR / VIEWER / `ownerUserId` grant) on a live non-archived authorization path consistent with task GET (non-owner members of archived projects → `403`)
- Request body: none. No filters in this slice.
- Response DTO: `{ comments: PublicCommentDto[] }` (live only)
- Success: `200`, including `{ comments: [] }`
- Errors: `400` invalid id; `401`; `403`; `404` unknown/deleted task; `503`; `500`

### `PATCH /api/tasks/:taskId/comments/:commentId` (protected)

- Auth: valid session cookie
- Who: author of the live comment only
- Request DTO: `{ body: string }`
- Validation: `body` required, non-empty after trim; UUID path params; reject `id`, `createdAt`, `authorUserId`, `taskId`, `deletedAt`, unknown fields; require at least the allowed field present under strict schema
- Behavior: update `body` only; identity and `createdAt` unchanged
- Response DTO: public comment DTO
- Success: `200`
- Errors: `400`; `401`; `403` non-author; `404` unknown/deleted task or comment / mismatched task; `409` archived parent when `ownerUserId`; `503`; `500`

### `DELETE /api/tasks/:taskId/comments/:commentId` (protected) — soft-delete

- Auth: valid session cookie
- Who: author **or** effective project OWNER
- Request body: none
- Behavior: set `deletedAt` to now when currently null. MUST NOT remove the database row. MUST NOT expose a restore route.
- Success: `204` empty body
- Errors: `400` invalid ids; `401`; `403` neither author nor OWNER; `404` unknown/deleted task or comment / mismatched task / already soft-deleted; `409` archived parent when `ownerUserId`; `503`; `500`

### Out of scope (Decided exclusions)

- Mention parsing or notification hooks (Q-060)
- HTML/Markdown render pipeline or rich-text editor (Q-061)
- Restore endpoint
- Hard-delete of comment rows via API

### Existing routes

Unchanged paths and existing public DTO field sets for auth, users, projects, members, tasks, dashboard, health, ready, probes.

### Error envelope

`{ error: { code, message } }` plus HTTP status. No secrets, stack traces, hashes, connection strings, session secrets, or `deletedAt`.

### CORS

Unchanged: configured origin with `credentials: true`; never `*`.

## 5. Persistence

- Prisma schema stays `backend/prisma/schema.prisma`. Add a comment model owned by `tasks`. Keep existing models. Do not add activity, label, audit, mention, or notification tables.
- Model `TaskComment` mapped to `task_comments`:
  - `id` UUID string, system-generated, primary key
  - `taskId` UUID, FK to `tasks.id`, `onDelete: Restrict`
  - `authorUserId` UUID, FK to `users.id`, `onDelete: Restrict`
  - `body` String, required
  - `createdAt` DateTime, required
  - `deletedAt` DateTime?, nullable; null means live
  - `@@index([taskId])`
  - `@@map("task_comments")`
- Relations: `Task.comments`; `User` author relation name that does not collide with membership
- Migration: **additive** versioned folder under `backend/prisma/migrations/`. Apply with `prisma migrate deploy` only. Do not `migrate reset`. Do not delete volumes.
- Repository contract:
  - `create({ taskId, authorUserId, body })` — persists `deletedAt` null
  - `findById(id)` — including soft-deleted rows (service decides not-found)
  - `listByTaskId(taskId)` — live rows only (`deletedAt` null), ascending by `createdAt`
  - `updateBody(id, body)` — live rows only
  - `softDelete(id)` — set `deletedAt` to now when currently null
- Transactions: single-row create/update/soft-delete do not require a multi-aggregate transaction. If create must verify live task + insert comment atomically, use an infrastructure transaction that still goes through owning repositories.
- Compatibility: existing task rows unchanged; comments optional; empty list when none exist.

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

- Extend `TaskDetail` (existing Dialog content) with a comments section: list + create form when `canWrite` is true.
- Edit UI only for comments where `authorUserId` equals the current user.
- Soft-delete UI for author or when the actor has OWNER chrome (same OWNER signal already used for Members Dialog / archive). Backend remains the security boundary.
- API helpers: `listTaskComments`, `createTaskComment`, `updateTaskComment`, `deleteTaskComment` with `credentials: 'include'`.
- States: loading, empty, success, validation/error, 401, 403, 404, 409 as applicable.
- VIEWER: list only (no create); may still soft-delete own comment if authorship exists after a role change; no create bypass.
- Render bodies as plain text (no Markdown renderer).
- Do not redesign board header, Members Dialog, Kanban columns, dashboard, or project grid.
- No restore UI. No new routes; comments live inside existing task detail.
- No new npm dependency.

## 7. Files

Expected responsibilities (illustrative; implementer may match existing tasks module naming):

- `backend/prisma/schema.prisma` — add `TaskComment` (+ relations, `deletedAt`)
- `backend/prisma/migrations/<timestamp>_task_comments/` — additive migration
- `backend/src/modules/project-members/access/` — extend `TaskAuthorizationPort` (or additive sibling) for effective OWNER check used by comment soft-delete
- `backend/src/modules/tasks/domain/` — comment entity/invariants/errors including soft-delete
- `backend/src/modules/tasks/repository/` — comment repository + Prisma adapter + test fake
- `backend/src/modules/tasks/service/` — create/list/updateBody/softDelete use cases
- `backend/src/modules/tasks/dto/` — public comment DTO mappers (omit `deletedAt`)
- `backend/src/modules/tasks/validators/` — Zod create/patch/params
- `backend/src/modules/tasks/controller/` + `routes/` — comment endpoints wired with `requireAuth`
- `backend/src/app` / `createApp` wiring — inject identity + authz ports into tasks
- `backend/src/modules/tasks/tests/` — domain, service, SuperTest cases
- `frontend/src/api/` — comment client helpers + types
- `frontend/src/tasks/TaskDetail.tsx` (+ tests) — comments UI

Do not place application source under `specs/`.

## 8. Dependencies and Config

- New packages: none.
- New env vars: none.
- Docker Compose: unchanged service topology.
- Justify any new dependency in an updated plan before adding.

## 9. Security and Failures

- Session required; author from session only.
- Create/list enforced via task read/write port; edit via authorship; soft-delete via authorship or effective OWNER; UI is not the security boundary.
- Zod strict validation at HTTP boundary.
- Map domain not-found / forbidden / archived-conflict to existing envelope codes.
- Never leak hashes, secrets, stack traces, session ids, or `deletedAt` in JSON.
- Soft-deleted task → `404` even for the author of prior comments.
- Soft-deleted comment → omitted from list; item ops `404`.

## 10. Testing

- Domain/unit (no HTTP/Prisma): non-empty body; author binding; soft-delete; author-only edit rules.
- Service: create/list/update/softDelete with fake comment repo + fake authz/OWNER port + fake identity port; VIEWER create forbidden; non-author edit forbidden; EDITOR non-author soft-delete forbidden; OWNER soft-delete allowed; deleted task/comment not found; archived write conflict.
- Repository/persistence (when `DATABASE_URL` present): create + ordered live list + softDelete hides from list.
- API SuperTest: AC-001–AC-007, AC-011, AC-014–AC-016 paths; 401/403/404/409/400/204; no secrets; no `deletedAt` in DTOs.
- Frontend Testing Library: TaskDetail shows list; writer can submit; author can edit; author/OWNER soft-delete chrome; viewer no successful create path; plain text; credentials include.
- Regression: existing task, membership, auth, health/ready, probe tests remain green.

## 11. Sequence

1. Confirm artifacts Approved (stop while Draft).
2. Domain comment behavior + unit tests (including soft-delete / edit invariants).
3. Repository contract + fake; then Prisma model + additive migration + adapter.
4. Extend `project-members` authz port for OWNER check as needed.
5. Service use cases (create/list/update/softDelete + identity).
6. DTOs, validators, controller, routes, `createApp` wiring.
7. Backend tests.
8. Frontend API helpers + TaskDetail UI + tests.
9. Typecheck/test verification; independent review; memory update.
10. Propose `implemented-features.md` patch only after Verified; wait for user confirmation before editing that catalog.

## 12. Risks

- **OWNER port extension:** Soft-delete needs effective OWNER, not only task-write. Mitigate by a narrow additive port method reusing `resolveEffectiveRole`, not a second permission matrix.
- **Author display after user rename:** `authorDisplayName` resolved at response time via identity port (current name), not a frozen snapshot — acceptable unless product later requires snapshot (not invented here).
- **Orphan comments after task soft-delete:** rows remain; HTTP is `404`. Later restore (**W**) may resurface comments — out of scope; document as known follow-on.
- **Unbounded body length:** no max length Decided; risk of very large strings — optional later product limit; do not invent a limit in this Draft.
- **Activity overlap (L):** implementing comments without emitting events is intentional; later activity must not be half-built here.
- **Label pressure (E):** do not sneak label fields onto cards in this feature.
- **Demoted authors:** Decided author-only edit and author soft-delete allow former writers who keep authorship even if role changes — intentional per Q-058/Q-059.

Alternatives considered and rejected for this folder:

- New peer `comments` domain — unnecessary; Q-065 keeps ownership in `tasks`
- Embedding comments on `GET /api/tasks/:id` — rejected to keep task DTO field set stable and list explicit
- Implementing **L**/**E** in the same batch — rejected by Q-062
- Hard-delete comments — rejected by Q-059
- OWNER/EDITOR editing others’ comments — rejected by Q-058
- Rich text / mentions — rejected by Q-060 / Q-061

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | POST create use case | SuperTest + service tests |
| AC-002 | requireAuth on routes | SuperTest 401 |
| AC-003 | Zod create validator | SuperTest 400 |
| AC-004 | GET list oldest-first live only | SuperTest + repo |
| AC-005 | requireTaskWrite on create | SuperTest VIEWER 403 |
| AC-006 | authz + soft-delete task/comment | SuperTest 403/404 |
| AC-007 | archived rules | SuperTest 409/403 |
| AC-008 | tasks module + ports | Review + structure tests |
| AC-009 | no L/E/audit/mentions/rich text | Spec compliance review |
| AC-010 | TaskDetail UI | Frontend tests |
| AC-011 | error mapper; omit `deletedAt` | SuperTest body asserts |
| AC-012 | npm test/typecheck | Executed commands |
| AC-013 | Draft gate | Approval gate |
| AC-014 | PATCH author body | SuperTest 200 |
| AC-015 | PATCH non-author | SuperTest 403 |
| AC-016 | DELETE soft-delete author/OWNER | SuperTest 204 / 403 / 404 |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
