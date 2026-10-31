# Implementation Plan: Collaboration

- **Feature ID:** 009-collaboration
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

These artifacts are **Approved**. Q-051, Q-052, Q-053, Q-054, Q-055, Q-056, and Q-057 are **Decided** in `spec.md` section 15. Follow those answers. Do not invent additional roles, SMTP, invite tokens, public share links, extra DTO fields, a members page, or `includeArchived`. Implement after `008-dashboard` is Verified.

This ID is **009-collaboration**. Do not write `specs/005-audit/`. Do not reuse IDs `005`–`007`. Do not specify dashboard in this folder (`008-dashboard`). Later audit MUST NOT use ID `005`.

## 1. Summary

Introduce domain `project-members` so an existing DevTrack user can be associated with a project under explicit role `OWNER` | `EDITOR` | `VIEWER`, and so **backend** resource-level authorization for projects and tasks uses membership + that matrix instead of sole `assertProjectOwner` / `ProjectAccessPort.requireOwnedProject`.

Keep the modular monolith. `projects` still owns `Project` rows, `ownerUserId`, and archive. `tasks` still owns `Task` rows. `project-members` owns membership rows and permission checks. Create-project still sets `ownerUserId` to the session actor and MUST insert an OWNER membership row for that actor. `ownerUserId` grants OWNER powers even without a membership row. Listing active projects MUST include projects the actor is authorized to see, not only owned rows.

Membership HTTP: `GET`/`POST /api/projects/:projectId/members` and `PATCH`/`DELETE /api/projects/:projectId/members/:userId`. Add by email of an existing user; no mail. Member management UI is a Dialog on the project board header. Non-owner members MUST NOT GET an archived project; only `ownerUserId` may.

Do not add SMTP, invite tokens, public share links, comments, notifications, Kanban redesign, workspace-ui redesign, dashboard, or audit.

No new npm dependencies. Persistence is an additive versioned Prisma migration. Do not `migrate reset` or delete `pgdata`.

## 2. Current State

Inspected 2026-10-31. `001-foundation` through `007-workspace-ui` are Verified. `008-dashboard` is Draft and out of this folder.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users`, `projects`, `tasks` under `backend/src/modules/`
- Prisma: `User` (`email` unique canonical lowercase, `displayName`); `Project` (`ownerUserId`, `archivedAt`, `@@index([ownerUserId])`); `Task` (status, priority, `dueDate`, `deletedAt`). No membership model. `User.ownedProjects` only.
- Migrations: `20261026120000_init_system_probe`, `20261026133000_authentication`, `20261027120000_projects`, `20261029150000_tasks`
- `ProjectsService` authorizes with `assertProjectOwner(actorId, project.ownerUserId)`
- `ProjectsRepository.listByOwnerId` returns **active** owned projects only
- `ProjectAccessAdapter.requireOwnedProject` used by `TasksService` for every task use case
- `UsersIdentityPort` already has `findById` and `findByEmail` (`UserIdentity`: `id`, `email`, `displayName`)
- HTTP: `POST/GET /api/projects`; `GET/PATCH /api/projects/:id`; `POST .../archive` and `.../unarchive`; `POST/GET /api/projects/:projectId/tasks`; `GET/PATCH/DELETE /api/tasks/:id` (DELETE → `204`)
- Error envelope: `VALIDATION_ERROR` `400`, `UNAUTHENTICATED` `401`, `FORBIDDEN` `403`, `NOT_FOUND` `404`, `CONFLICT` `409`
- `createApp` wires `ProjectAccessAdapter` into `TasksService`; no `project-members` module
- Frontend destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; board header already has Back / Edit / Archive and copied shadcn Dialog; `GET /api/users/me` available for actor id
- Tests encode owner-only `403` for a second authenticated user on projects and tasks

Absent:

- `project-members` module, table, routes, UI
- Any mailer or share-link support

Limitations to respect:

- Do not contradict Q-051–Q-057
- Do not specify or implement dashboard in this folder
- Do not write `specs/005-audit/`
- Do not reset the database or delete `pgdata`
- Do not change task/project **field** contracts except authorization semantics and additive membership resources
- `listByOwnerId` cannot express member-visible projects; listing MUST change in the repository/use-case layer, not by adding `includeArchived`
- Frontend tests and backend SuperTest cases that assume “non-owner always 403” MUST be updated only for the membership grant paths this spec defines
- `008-dashboard` remains owner-only in its own folder until that spec is changed separately

## 3. Domain Boundaries

- Owning domain: **`project-members`** (membership identity, uniqueness per project+user, role enum, permission policy, membership use cases)
- Other domains:
  - `projects` — `Project` persistence, `ownerUserId`, archive/unarchive, name/description; **stops** being the sole authorizer of shared access
  - `tasks` — task persistence and invariants; **stops** using owner-only `requireOwnedProject` as the only grant
  - `auth` — session middleware only
  - `users` — identity/profile; existing-user lookup via `UsersIdentityPort.findByEmail` / `findById`. `project-members` MUST NOT import `prisma-users-repository`
  - `system` — unchanged
- Invariants:
  - Member is an existing user; no user create from membership
  - At most one membership per (`projectId`, `userId`)
  - Role is `OWNER` | `EDITOR` | `VIEWER`
  - No pending invite state; no SMTP
  - `ownerUserId` remains on `Project`; client cannot set it
  - Creating owner is inserted as OWNER membership
  - `ownerUserId` user cannot be removed or demoted from OWNER
  - Project cannot be left with no OWNER
  - Auth middleware does not compare roles
  - Task `projectId` immutable; soft-delete unchanged; archived parent writes `409` only for an authorized actor
  - Non-owner members are not authorized on archived projects
- Cross-domain interfaces (acyclic):
  - `project-members` MAY depend on a narrow **project snapshot port** owned by `projects` (`id`, `ownerUserId`, `archivedAt`) — same information as today’s `OwnedProjectSnapshot`. It MUST NOT import `prisma-projects-repository`.
  - `project-members` MAY depend on `UsersIdentityPort` (`findById` / `findByEmail`). It MUST NOT import `prisma-users-repository`.
  - `tasks` MUST depend on a membership-aware **authorization port** owned by `project-members` (operations: read-project, patch-project, archive, unarchive, task-read, task-write). `tasks` MUST NOT import `project-members` or `projects` Prisma repositories. Today’s `ProjectAccessPort.requireOwnedProject` MUST NOT remain the sole task grant.
  - `projects` MUST NOT import the `project-members` module or its Prisma repository (avoids `projects` ↔ `project-members` cycle).
  - For project **list/get/mutate** authorization, define a **consumer-owned** port interface **inside `projects`**. Implement that interface in `project-members` (adapter imports the `projects` interface). `projects` depends only on its own interface. Wiring lives in `createApp`. Suggested capabilities: authorized active project ids for an actor; whether the actor may perform a named project operation (including archived GET only for `ownerUserId`).
  - Owner membership on create: consumer-owned write port interface in `projects`, implementation in `project-members`. Do not write membership rows from `prisma-projects-repository`. Create-project + owner membership MUST be **atomic** (constitution: transactions). Use an infrastructure transaction that still maps through each owning repository. Do not compensating-delete projects as a product rule.
  - `users` MUST NOT import `project-members`. `auth` MUST NOT import `project-members`. `system` MUST NOT call `project-members`.
- Dependency direction: domain objects MUST NOT import Express, HTTP, Prisma Client, or drivers. Controllers → services → repository contracts / ports. Prisma adapters implement repositories.
- Controller, service, repository, DTOs, routes, validators, domain objects: owned by `project-members` under `backend/src/modules/project-members/`.
- Suggested root: `backend/src/modules/project-members/{domain,dto,repository,service,controller,routes,validators,tests}` plus an `access/` (or equivalent) for the port `tasks` consumes.

Do not add `dashboard`, `audit`, `mail`, or empty product folders.

### Permission policy (encode in `project-members` domain)

Resolve effective role: if `actorId === project.ownerUserId` → OWNER; else membership role if present; else unauthorized.

Then apply the spec matrix. Archived GET: allow only when `actorId === ownerUserId`, even if another member has role OWNER.

## 4. API Contract

Reuse the existing error envelope. Reuse `VALIDATION_ERROR` `400`, `UNAUTHENTICATED` `401`, `FORBIDDEN` `403`, `NOT_FOUND` `404`, `CONFLICT` `409`. Do not invent a new error code.

Public **project** DTO field set **unchanged**:

```
{
  id: string,
  ownerUserId: string,
  name: string,
  description: string | null,
  createdAt: string,
  archivedAt: string | null
}
```

Public **task** DTO field set unchanged from `004-tasks`. Do not add assignee. Do not add role to either DTO.

All protected routes: valid session cookie required.

Authorization/not-found order **unchanged**:

1. Invalid session → `401`
2. Collection/project routes: unknown project → `404`; authenticated but not authorized on an existing project → `403`
3. Task item routes: unknown or soft-deleted task → `404` for every caller
4. Live task whose parent the actor is not authorized for → `403`
5. Authorized task write whose parent is archived → `409`

### Existing project and task routes (authorization semantics change)

Paths and request/response **shapes** stay as verified in `003-projects` / `004-tasks` / `006-kanban` (including `PATCH /api/tasks/:id` `{ status }` for Kanban). Nested task collection already uses `:projectId`; project item routes keep `:id`.

- `POST /api/projects` — `ownerUserId = actor` and insert OWNER membership atomically. Client cannot set owner.
- `GET /api/projects` — active projects the actor is authorized to see (OWNER grant via `ownerUserId` or any membership). Still no query params. Still `{ projects: PublicProjectDto[] }`. Newest `createdAt` first.
- `GET /api/projects/:id` — success when authorized to read an **active** project (any member role or owner grant). Archived: **only** `ownerUserId` → `200`; any other member including extra OWNER-role members → `403`.
- `PATCH /api/projects/:id` — OWNER or EDITOR on an active project. VIEWER `403`. Archived PATCH still `409` for an actor who would otherwise be allowed to PATCH (the `ownerUserId` user). Non-owner members on archived → `403`.
- `POST .../archive` and `.../unarchive` — OWNER only (role or `ownerUserId` grant). EDITOR/VIEWER `403`.
- Task collection and item routes — OWNER/EDITOR: full CRUD; VIEWER: GET/list only; non-member: `403`; non-owner on archived parent: `403`.

Do not add `includeArchived`. Do not add a move/rank endpoint.

### New membership routes

Existing project item routes use `:id`. Membership routes follow the decided `:projectId` param (same pattern as tasks collection).

Public member DTO (no extra fields):

```
{
  id: string,
  userId: string,
  email: string,
  displayName: string,
  role: "OWNER" | "EDITOR" | "VIEWER",
  createdAt: string
}
```

`email` and `displayName` come from `User` via identity lookup. Do not add a `name` field. Do not nest a user object. Do not include password, hashes, or session data.

List wrapper: `{ members: PublicMemberDto[] }`. Order: newest `createdAt` first. Empty collection is `200` `{ members: [] }`.

Validation: UUID `:projectId` and `:userId`; strict Zod; reject unknown fields; reject client-supplied membership `id` / `createdAt` / `userId` in POST/PATCH bodies (association is the path for PATCH/DELETE).

#### `GET /api/projects/:projectId/members` (protected)

- Auth: valid session cookie
- Who: any actor authorized to GET that project (live: OWNER/EDITOR/VIEWER or owner grant; archived: `ownerUserId` only)
- Request body: none
- Success: `200` `{ members: PublicMemberDto[] }`
- Errors: `401`; `404` unknown project; `403` existing project but not authorized (including non-owner members of an archived project)

#### `POST /api/projects/:projectId/members` (protected)

- Auth: valid session cookie
- Who: OWNER only (role or `ownerUserId` grant)
- Request DTO: `{ email: string, role: "OWNER" | "EDITOR" | "VIEWER" }`
- Validation: `email` trim + `z.email()` then canonical lowercase lookup (same as register); `role` enum; reject unknown fields
- Lookup: `UsersIdentityPort.findByEmail`. Do not send mail. Do not create a user.
- Success: `201` public member DTO
- Errors: `400` validation; `401`; `404` unknown project; `403` not OWNER; `404` unknown email; `409` duplicate (`projectId`,`userId`); `503`; `500`

#### `PATCH /api/projects/:projectId/members/:userId` (protected)

- Auth: valid session cookie
- Who: OWNER only
- Request DTO: `{ role: "OWNER" | "EDITOR" | "VIEWER" }`
- Success: `200` public member DTO
- Errors: `400`; `401`; `404` unknown project; `403` not OWNER; `404` `:userId` is not a member; `409` demoting `ownerUserId` or leaving the project with no OWNER

#### `DELETE /api/projects/:projectId/members/:userId` (protected)

- Auth: valid session cookie
- Who: OWNER only
- Success: `204` empty body; membership row deleted (not User, not Project)
- Errors: `401`; `404` unknown project; `403` not OWNER; `404` `:userId` is not a member; `409` removing `ownerUserId` or leaving the project with no OWNER

### Existing routes unchanged in path

Auth register/login/logout, `GET`/`PATCH /api/users/me`, public `GET /health` and `GET /ready`, authenticated probes. No dashboard route in this folder. No `/members` page route on the frontend.

### Error envelope

`{ error: { code, message } }` plus HTTP status. No secrets, stack traces, hashes, connection strings, or session secrets.

### CORS

Unchanged: configured origin with `credentials: true`; never `*`.

## 5. Persistence

- Prisma schema stays `backend/prisma/schema.prisma`.
- Add model `ProjectMember` owned by `project-members`. Keep `SystemProbe`, `User`, `AuthPasswordCredential`, `AuthSession`, `Project`, `Task`.
- Prisma:

```
enum ProjectMemberRole {
  OWNER
  EDITOR
  VIEWER
}

model ProjectMember {
  id        String            @id @db.Uuid
  projectId String            @db.Uuid
  userId    String            @db.Uuid
  role      ProjectMemberRole
  createdAt DateTime
  project   Project           @relation(fields: [projectId], references: [id], onDelete: Restrict)
  user      User              @relation(fields: [userId], references: [id], onDelete: Restrict)

  @@unique([projectId, userId])
  @@index([userId])
  @@map("project_members")
}
```

- `Project.ownerUserId` **stays**. Do not drop it. Do not add `coverColor`, `position`, palette, or audit tables.
- `User` MAY gain a `projectMemberships` relation; `Project` MAY gain a `members` relation. No User profile columns.
- No invite/token/mail tables.
- Migration: **additive**, versioned under `backend/prisma/migrations/`. Workflow remains generate / migrate / `prisma migrate deploy`. Do not infer readiness from container start. Do not `migrate reset`. Do not delete `pgdata`.
- Repository contract owned by `project-members`: create, list by project, find by project+user, list project ids by user, delete, update role. Prisma adapter maps to domain objects, not Prisma types as DTOs.
- Transactions: add-member is one insert; uniqueness relies on the unique constraint (map violation → `409`, not Prisma 500). Create-project + owner membership MUST be one transaction across owning repositories (infrastructure unit of work / Prisma `$transaction` in wiring), so a successful create never leaves a `Project` without the creating OWNER row.
- Compatibility: existing owner-only rows remain valid. `ownerUserId` still grants OWNER if a membership row is missing. Members of other users’ projects appear only after membership rows exist. Existing SuperTest owner isolation stays valid for users **without** membership.

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

Do not redesign workspace UI. Do not add a dashboard screen. Do not add a members page.

- Destinations stay as in `007-workspace-ui`.
- `GET /api/projects` will start returning member-visible active projects. Sidebar and `/projects` card grid **reuse** that list. Update tests that assume the list is owner-only.
- `/projects/:projectId` Kanban, existing Dialogs, and status-only `@dnd-kit/core` DnD stay. They already call existing task APIs; backend authz change is sufficient for permitted members. Do not change DnD library or add rank.
- Member management: additional Dialog on the **project board header** (alongside Back / Edit / Archive). Copied shadcn Dialog only. Contents: member list (`email`, `displayName`, `role`); add form `{ email, role }`; change role; remove. Loading, empty, success, 401, 403, 404, 409, and validation error states.
- Role chrome (hide, not authorize): resolve actor via `GET /api/users/me` plus `GET` members (actor’s `role`) and/or `project.ownerUserId === me`. OWNER: Edit, Archive/Unarchive, Members Dialog, full task writes/DnD. EDITOR: Edit and full task writes/DnD; no Archive/Unarchive; no membership admin controls. VIEWER: project/task read; no Edit, Archive, add-task, or DnD writes.
- API client: `frontend/src/api/client.ts` keeps `credentials: 'include'`. Add typed helpers for the four membership endpoints. No bearer token storage.
- Guests: no product sidebar. No second CSS framework. No DropdownMenu required. No Trello branding.
- Do not implement dashboard widgets, audit history, or invite-email forms.

## 7. Files

Expected (names may match existing module conventions; do not create empty folders to decorate the template):

- `backend/prisma/schema.prisma` — `ProjectMember` + `ProjectMemberRole` + relations
- `backend/prisma/migrations/<timestamp>_project_members/` — additive migration
- `backend/src/modules/project-members/domain/` — entity, uniqueness, owner-row invariants, errors, permission policy
- `backend/src/modules/project-members/repository/` — contract + Prisma adapter
- `backend/src/modules/project-members/service/` — add-by-email, list, remove, change role
- `backend/src/modules/project-members/dto/`, `validators/`, `controller/`, `routes/`
- `backend/src/modules/project-members/access/` — authorization port for `tasks`
- `backend/src/modules/projects/access/` — keep snapshot port; stop using owner-only as the only grant for `tasks`
- `backend/src/modules/projects/domain/authorization.ts` — owner-only helper MUST NOT remain the only project grant
- `backend/src/modules/projects/service/projects-service.ts`, `repository/` — authorized list; consumer-owned membership query/write ports; archived GET gate
- `backend/src/modules/tasks/service/tasks-service.ts` — membership-aware port
- `backend/src/app.ts` — wire `project-members` router, adapters, create-project transaction
- `backend/src/modules/project-members/tests/` plus updates to `projects-api`, `tasks-api`, service tests that encode owner-only exclusivity
- `frontend/src/api/client.ts` and `frontend/src/api/types.ts` — membership helpers/DTOs
- `frontend/src/projects/ProjectDetail.tsx` — Members Dialog trigger on board header; role chrome
- Frontend member-dialog component under `frontend/src/projects/` (or equivalent); tests
- Do **not** add files under `specs/` as implementation. Do **not** add `specs/005-audit/`. Do **not** change `specs/008-dashboard/` from this feature.

## 8. Dependencies and Config

- New npm packages: **none expected**. Do not add a mailer, queue, or share-link library.
- New env vars: **none expected**. Do not add SMTP settings.
- Docker Compose: unchanged three services. No fourth container.
- `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL` unchanged.
- Additional dependencies require an explicit documented decision (`prompt.md`).

## 9. Security and Failures

- `createRequireAuth` stays on protected routes. Membership and project/task services authorize resources.
- Non-member / insufficient role → `403`. Missing project → `404`. Invalid session → `401`. Unknown email on add → `404`. Duplicate member → `409`. Owner-row / last-OWNER invariant → `409`.
- Validate at HTTP boundary (Zod strict objects). Canonicalize email before lookup.
- Do not leak hashes, session ids, stack traces, or `DATABASE_URL`.
- Do not treat unknown users as an invitation to send email.
- Do not create public unauthenticated read of projects.
- Map domain errors in the existing centralized error handler; add mappings for new `project-members` errors without exposing internals.
- Unique constraint violation on (`projectId`, `userId`) MUST become `409` `CONFLICT`, not a 500 with Prisma details.

## 10. Testing

- Domain (no HTTP/Prisma): uniqueness; existing-user-only; matrix policy function; `ownerUserId` OWNER grant; cannot remove/demote `ownerUserId`; cannot leave zero OWNER; archived GET only `ownerUserId`; authz ≠ authentication.
- Service: add by email; unknown email `NOT_FOUND`; duplicate; OWNER-only admin; create-project inserts OWNER row; list/remove/role-change.
- Repository / Prisma: unique constraint; FK Restrict; list by project; list project ids by user.
- API SuperTest: AC-001–AC-008, AC-012, AC-015–AC-017; existing auth/profile/health/ready/probes still pass; former owner-only tests updated so a **member** with a permitting role succeeds and a non-member still `403`.
- Frontend Testing Library: authorized member sees shared project in list/grid/sidebar; Kanban still works for EDITOR/OWNER; VIEWER cannot write; Members Dialog on board header for OWNER; credentials include; no token storage; no members page; no dashboard from this folder.

## 11. Sequence

Safe order after **explicit approval** (status still Draft until then):

1. Inspect (no code). Stop if still Draft.
2. Domain + in-memory repository + permission policy from the recorded matrix.
3. Additive Prisma migration + Prisma repository. Deploy migrate; no reset.
4. Membership service use cases (add by email, list, remove, change role) + owner-row invariants.
5. Membership HTTP + `createApp` wiring.
6. Consumer-owned ports on `projects`; membership-aware port for `tasks`; atomic create-project + OWNER row.
7. Update `GET /api/projects` and project/task mutation authz, including archived GET.
8. Backend tests.
9. Frontend client; list/sidebar; board-header Members Dialog; role chrome.
10. Frontend tests; typecheck; AC pass; independent review; `memory.md`.

Do not start dashboard, audit, mail, or Kanban redesign in this sequence.

## 12. Risks

- **Circular domain imports.** Mitigation: snapshot port owned by `projects`; consumer-owned query/write ports in `projects` implemented by `project-members`; `tasks` → `project-members` only.
- **Two sources of truth (`ownerUserId` vs OWNER row).** Mitigation: keep `ownerUserId`; insert OWNER row on create; grant OWNER if either applies; forbid removing/demoting the `ownerUserId` user; no transfer.
- **Additional OWNER-role member vs Q-057.** An extra OWNER member may archive (matrix) but MUST NOT GET the archived project (only `ownerUserId`). Unarchive remains an OWNER-role operation by id. Recorded as specified; do not silently forbid adding OWNER members.
- **Owner-only tests and UI assume exclusivity.** Mitigation: keep non-member `403`; add member success cases; do not weaken 401/404.
- **`008-dashboard` owner-only.** Member-scoped aggregates are not this folder’s job. Do not specify dashboard here.
- **Email lookup vs invites.** Mitigation: no SMTP; no pending state; unknown email `404`; no account create.
- **Atomic create + membership.** Mitigation: infrastructure transaction through owning repositories; `ownerUserId` grant remains a backstop if a legacy row lacks membership.
- Alternatives considered and rejected: invite-by-email; public share links; putting authorization only in React; creating `project-members` inside `projects` Prisma repository; adding `role` to `PublicProjectDto`; `includeArchived`; microservices; members page.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | Authorized list/GET via membership | SuperTest + UI |
| AC-002 | `requireAuth` on protected routes | SuperTest 401 |
| AC-003 | Permission/membership deny | SuperTest 403 |
| AC-004 | Missing project including members paths | SuperTest 404 |
| AC-005 | Policy from Q-051/Q-052 | Domain + API tests |
| AC-006 | Add by email; no mail; 404/409 | Service + SuperTest |
| AC-007 | `tasks` uses members authz port | SuperTest task 201/403/409 |
| AC-008 | `POST /api/projects` owner + OWNER row | SuperTest create |
| AC-009 | New module + ports | Review + typecheck |
| AC-010 | No dashboard/audit/mail in this folder | Review |
| AC-011 | Board-header Dialog; role chrome | Frontend tests |
| AC-012 | Envelope | SuperTest |
| AC-013 | Executed commands | typecheck + test |
| AC-014 | Approval gate; recorded answers | T002 stop if Draft |
| AC-015 | Archived GET `ownerUserId` only | SuperTest |
| AC-016 | Owner-row / last-OWNER `409` | Domain + SuperTest |
| AC-017 | Membership HTTP contract | SuperTest |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved for implementation: Yes
