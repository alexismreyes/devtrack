# Feature Specification: Collaboration

- **ID:** 009-collaboration
- **Status:** Verified
- **Created:** 2026-10-31
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified), 004-tasks (Verified), 005-frontend-shell (Verified), 006-kanban (Verified), 007-workspace-ui (Verified), 008-dashboard (Draft; **out of this folder**)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Implement only this approved scope after `008-dashboard` is Verified. Q-051, Q-052, Q-053, Q-054, Q-055, Q-056, and Q-057 are **Decided** and recorded in section 15. Follow those answers. Do not invent additional roles, invite/SMTP behavior, public share links, or extra DTO fields.

This ID is **009-collaboration**. Do not write `specs/005-audit/`. Do not reuse feature IDs `005`, `006`, or `007`. Do not specify dashboard in this folder (`008-dashboard`). Later audit MUST NOT use ID `005` and MUST NOT be written as `specs/005-audit/`.

## 1. Problem

Verified slices persist **owner-only** projects (`Project.ownerUserId`) and project-scoped tasks. Resource-level authorization today is “actor id equals `ownerUserId`.” `ProjectAccessPort.requireOwnedProject` is how `tasks` enforces that. Listing is `listByOwnerId` of active owned projects. Authenticated non-owners receive `403` on another user’s project and tasks.

`prompt.md` still requires **collaboration**: membership, explicit roles and permissions, and backend resource-level authorization. Proposed domain: `project-members`. Small teams cannot yet share a project: a valid session that is not the owner cannot be granted access, and there is no persisted membership or permission check distinct from ownership.

Email invite is `proposed-features.md` item **M** and is **out of scope** here. Public share links (**O**) are out of scope. SMTP is out of scope.

## 2. Goals

- Persist project membership that associates an **existing** DevTrack user with a project and an **explicit role** from `{ OWNER, EDITOR, VIEWER }`.
- Authorize protected project and task operations in the **backend** using membership and that role’s permissions, not only `Project.ownerUserId`, and not only the frontend.
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to a project the actor is not authorized to see.
- Introduce bounded context `project-members` in the modular monolith. Do not turn `auth` middleware into resource authorization.
- Keep `Project.ownerUserId` as the creating owner association from `003-projects`. The client still MUST NOT supply or change it. Creating a project MUST also insert an OWNER membership row for that actor.
- Keep verified register, login, logout, profile, project field rules, task field rules, Kanban persistence, and workspace-ui destinations. Do not redesign workspace UI. Do not specify dashboard here.
- Provide member management as a **Dialog on the project board header**. Do not add a members page.
- Reuse session cookie `devtrack_session`, CORS with credentials, Zod, error envelope, Prisma behind owning repositories, and Vitest / Testing Library / SuperTest.

## 3. Non-Goals

- Additional role names beyond `OWNER`, `EDITOR`, and `VIEWER`.
- Invite-by-email, SMTP, outbound mail, invite tokens, pending/accepted invite state, or creating accounts for people who are not already users (`proposed-features.md` **M**).
- Public or read-only share links (`proposed-features.md` **O**).
- Comments, notifications, activity feeds, assignees as a task field, labels, checklists, attachments, search, calendar view, or AI.
- Dashboard summaries, counts, destination, or aggregates. Those belong in `008-dashboard` only. Do not specify or change dashboard in this folder.
- Kanban redesign, drag-and-drop changes, `@dnd-kit/sortable`, or a `position` / `rank` field.
- Workspace-ui redesign (card grid, compact sidebar, Dialogs, palettes, remaining-height columns, DragOverlay). Member management is an additional Dialog on the existing board header only.
- App-wide CRUD audit. Do not write `specs/005-audit/`. Later audit MUST NOT use IDs `005`, `006`, or `007`.
- Owner transfer (changing `ownerUserId`). Out of scope.
- Hard-delete of projects or tasks; restore of soft-deleted tasks; `includeArchived` on `GET /api/projects`; changing task enumerations or `projectId` immutability.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).

## 4. Actors and User Stories

### User Story US-001

As an authenticated user who is authorized on a project, I want that project to appear in my authorized list and be readable through the backend, so that collaboration is not limited to `ownerUserId`.

### User Story US-002

As an OWNER or EDITOR, I want to create, read, update, list, filter, and soft-delete tasks on a shared project; as a VIEWER I want to read and list those tasks only, so that team work uses the same task APIs with resource-level checks.

### User Story US-003

As an authenticated user, I want explicit `OWNER` / `EDITOR` / `VIEWER` permissions enforced in the backend, so that hiding UI is not treated as authorization.

### User Story US-004

As an authenticated user who is not a member and is not `ownerUserId`, I want other users’ projects and tasks to stay forbidden, so that a valid session is not a global grant.

### User Story US-005

As a developer, I want membership owned by `project-members` with narrow ports and no circular domain imports, so that `projects` and `tasks` keep their invariants.

### User Story US-006

As a developer, I want existing auth, profile, Kanban persistence, and workspace destinations to keep working, so that collaboration does not replace verified slices or specify dashboard here.

### User Story US-007

As an OWNER, I want to add an existing user by email, list members, change roles, and remove members from a Dialog on the project board header, so that I can share a project without a new page, mail, or invite tokens.

## 5. Functional Requirements

- **FR-001:** An authenticated actor MUST be able to be a **member** of a project they did not create, once an OWNER adds them by email of an **existing** `users` identity (Q-053). Membership MUST NOT create a user. Unauthenticated callers MUST NOT read or change membership or project/task resources.
- **FR-002:** Each membership MUST have a system-assigned identity, a project association, a user association, an **explicit role** `OWNER` | `EDITOR` | `VIEWER` (Q-051), and a created time. Duplicate membership of the same user on the same project MUST NOT exist (`409` `CONFLICT`). This feature MUST NOT add pending invite status, invite tokens, or mail fields.
- **FR-003:** Protected **project** operations MUST authorize the actor using membership plus `ownerUserId` OWNER grant (Q-052), not “session is enough,” and not frontend-only checks. `Project.ownerUserId` remains persisted and immutable via PATCH. `ownerUserId` grants OWNER powers even without a membership row. Create-project remains: authenticated actor becomes `ownerUserId`; the client MUST NOT supply owner; the creating owner MUST also be inserted as an OWNER membership row (Q-054).
- **FR-004:** Protected **task** operations (create, GET, PATCH, list/filter, soft-delete) MUST authorize via the parent project’s membership and Q-052, not solely `requireOwnedProject` / `assertProjectOwner`. OWNER and EDITOR: full task CRUD. VIEWER: task GET and list/filter only. Task field rules, enumerations, defaults, immutable `projectId`, soft-delete, and archived-parent `409` on writes for an **authorized** actor stay as in `004-tasks`. Unknown or soft-deleted task ids stay `404` for every caller.
- **FR-005:** `GET /api/projects` MUST return **active** projects the caller is authorized to see (owned via `ownerUserId` or membership), not only rows where `ownerUserId` equals the actor. Default list still excludes archived projects (`archivedAt` not null). There is still no `includeArchived` query filter. Empty authorized list remains `200` with `{ projects: [] }`.
- **FR-006:** Authentication MUST remain distinct from authorization. Protected operations MUST require a valid `devtrack_session`. Missing, malformed, expired, revoked, or unknown cookies MUST fail as unauthenticated (`401`). `auth` middleware MUST NOT decide membership or role permissions. Frontend route guards, hidden buttons, and client-only checks MUST NOT replace backend checks.
- **FR-007:** An authenticated actor who is not authorized for a live project MUST receive `403` `{ error: { code: "FORBIDDEN", message } }` on protected project operations and on task operations whose parent exists. A project id that does not exist MUST remain `404`. Do not change the existing 401 → 404-missing-project vs 403-existing-unauthorized order.
- **FR-008:** Membership management MUST be backend-enforced, session-protected, and validated at the HTTP boundary with Zod. Add member: `POST` body `{ email, role }` identifying an existing user by email; lookup only; **do not send mail**; no invite tokens (Q-053). Unknown email → `404` `NOT_FOUND`; do not create a user. Duplicate member → `409` `CONFLICT`. Only OWNER (role or `ownerUserId` grant) may add, remove, or change roles (Q-054). Paths and DTOs are Q-055.
- **FR-009:** The backend MUST remain a modular monolith. `project-members` MUST own membership persistence, uniqueness, role assignment, and permission checks. `projects` MUST keep owning `Project` persistence, `ownerUserId`, and archive lifecycle. `tasks` MUST keep owning task persistence and task invariants. `auth` owns sessions. `users` owns identity/profile. `system` owns probes/readiness. A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced. `projects` MUST NOT import the `project-members` Prisma repository. `project-members` MUST NOT import the `projects` or `tasks` Prisma repositories. `tasks` MUST NOT import those Prisma repositories.
- **FR-010:** Prisma MUST be used only behind owning-domain repositories. Membership persistence MUST be an **additive** versioned migration under `backend/prisma/`. Do not `migrate reset` or delete volumes. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be domain entities or public DTOs. Model `ProjectMember` with fields and constraints in Q-055.
- **FR-011:** Existing product destinations MUST remain: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; unknown paths → not-found. This feature MUST NOT add a dashboard destination, MUST NOT add a members page, and MUST NOT redesign workspace UI. Authorized members MUST be able to use existing `/projects` and `/projects/:projectId` **per their role**. Member management UI is a Dialog on the project board header (Q-056).
- **FR-012:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, or sensitive database data. Existing project and task success DTO **field sets** MUST NOT gain a client-facing role or other new fields.
- **FR-013:** Domain membership uniqueness, “existing user only,” permission-matrix policy, owner-row invariants, and authorization-vs-authentication MUST be testable without HTTP or Prisma. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-014:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public. Probe HTTP remains authenticated and unused as product chrome.
- **FR-015:** This feature MUST NOT implement dashboard, audit, email, AI, comments, notifications, or public links. It MUST NOT write `specs/005-audit/` or specify dashboard behavior in this folder.
- **FR-016:** Non-owner members MUST NOT `GET` an archived project by id. Only the user whose id equals `ownerUserId` MAY `GET` an archived project. Do not add `includeArchived` (Q-057). Non-owner members are not authorized on an archived project, so their task and membership calls on that archived project MUST be `403`.
- **FR-017:** The creating `ownerUserId` user MUST NOT be removed from membership. A remove or role change MUST NOT leave the project with no OWNER (`ownerUserId` grant and/or an OWNER membership row). Owner transfer is out of scope.

### Permission matrix (Q-051, Q-052)

`Project.ownerUserId` grants the **OWNER** column even without a membership row. An OWNER membership row also grants that column.

| Operation | OWNER | EDITOR | VIEWER |
| --- | --- | --- | --- |
| Appear in `GET /api/projects` (active only) | yes | yes | yes |
| `GET` active project by id | yes | yes | yes |
| `GET` archived project by id | **only `ownerUserId`** (Q-057) | no (`403`) | no (`403`) |
| `PATCH` project `name` / `description` | yes | yes | no (`403`) |
| Archive / unarchive | yes | no (`403`) | no (`403`) |
| Task create, PATCH, soft-delete | yes | yes | no (`403`) |
| Task GET, list/filter | yes | yes | yes |
| `GET` members (roster read) | yes | yes | yes |
| Add member, change role, remove member | yes | no (`403`) | no (`403`) |

`GET` members is roster read so the board can apply role chrome without adding a role field to `PublicProjectDto`. It is **not** membership admin. Membership admin is add / change role / remove, OWNER only.

VIEWER and EDITOR who are not `ownerUserId` MUST receive `403` on `GET` archived, including additional users who hold an OWNER **role** but are not `ownerUserId`.

## 6. Acceptance Criteria

### Scenario AC-001: Authorized member can access a shared project

- Given an authenticated EDITOR or VIEWER who is a member of an **active** project they did not create
- When they list projects and GET that project
- Then list includes that active project, GET returns `200` with the public project DTO, and they MUST NOT be limited to `ownerUserId === actor` as the only rule

### Scenario AC-002: Unauthenticated access

- Given a caller with no valid session cookie (missing, malformed, expired, revoked, or unknown)
- When they call protected project, task, or membership operations
- Then the API responds `401` with `{ error: { code: "UNAUTHENTICATED", message } }` and does not return membership, project, or task data or persist changes

### Scenario AC-003: Unauthorized actor is forbidden

- Given project P exists and authenticated user B is not `ownerUserId` and has no membership on P
- When B tries to GET, PATCH, archive, or unarchive P, or to create/list/GET/PATCH/soft-delete tasks on P, or to read or change P’s membership
- Then the API responds `403` with `{ error: { code: "FORBIDDEN", message } }`, P is unchanged, and success bodies are not returned

### Scenario AC-004: Missing project still not found

- Given an authenticated user
- When they access a project id that does not exist, including `/api/projects/:projectId/members` and `/api/projects/:projectId/members/:userId`
- Then the API responds `404` with `{ error: { code: "NOT_FOUND", message } }`

### Scenario AC-005: Permission matrix honored

- Given the matrix in FR-003 / section 5
- When an OWNER (role or `ownerUserId` grant) performs a permitted project, task, or membership-admin operation
- Then the backend allows it (existing success codes: project PATCH `200`, task create `201`, add member `201`, and so on)
- When an EDITOR PATCHes project `name`/`description` or performs task CRUD on an active project
- Then the backend allows it
- When an EDITOR archives, unarchives, adds a member, changes a role, or removes a member
- Then the API responds `403` and does not persist the change
- When a VIEWER GETs/lists an active project and its tasks
- Then the backend allows it
- When a VIEWER PATCHes the project, archives, unarchives, creates/PATCHes/soft-deletes a task, or performs membership admin
- Then the API responds `403` and does not persist the change

### Scenario AC-006: Add member without mail

- Given an OWNER of an active project and an existing DevTrack user U who is not yet a member
- When they `POST /api/projects/:projectId/members` with `{ email: U.email, role: "EDITOR" }` (or `VIEWER` / `OWNER`)
- Then a membership row is persisted, no email is sent, no SMTP is used, the response is `201` with the public member DTO, and a later `GET` members list includes U with `id`, `email`, and `displayName`
- When they try to add an email that is not an existing DevTrack user
- Then the API responds `404` `{ error: { code: "NOT_FOUND", message } }`, does not create a user, and does not send mail
- When they add the same user to the same project a second time
- Then the API responds `409` `{ error: { code: "CONFLICT", message } }` and no second membership row exists

### Scenario AC-007: Task authorization follows the parent project

- Given an authenticated EDITOR (or OWNER) of an **active** project
- When they create a task with a valid title
- Then the task is persisted and `201` returns the public task DTO as in `004-tasks`
- Given a VIEWER or a non-member
- When they try to create a task on that project
- Then the API responds `403` and no task is persisted
- Archived parent still yields `409` `CONFLICT` on create/update/soft-delete when the actor is **otherwise authorized** (the `ownerUserId` user). Non-owner members are not authorized on archived projects, so they receive `403` instead of `409`.

### Scenario AC-008: Owner association unchanged on create

- Given an authenticated user
- When they create a project
- Then `ownerUserId` is that user’s id, the client cannot set owner, names/description/archive rules remain as in `003-projects`, **and** an OWNER membership row is inserted for that user on that project

### Scenario AC-009: Architecture and domain boundary

- Given membership create/list/remove/role-change and an authorized project/task call
- When the request is handled
- Then control stays Express route → owning controller → service → repository → Prisma for that domain’s persistence; `project-members` exists; `auth` middleware does not compare roles; Prisma types are not public DTOs; `projects` does not import `project-members` Prisma; `tasks` does not import `projects` or `project-members` Prisma; there is no circular domain dependency

### Scenario AC-010: Existing slices remain (except superseded owner-only authz)

- Given verified auth, users, Kanban, and workspace-ui
- When this feature is implemented
- Then register, login, logout, own-profile, `GET /health`, `GET /ready`, probe HTTP, task field enumerations, status-only DnD via `PATCH /api/tasks/:id` `{ status }`, destinations, palettes, and Dialogs still behave as verified
- Then owner-only listing and `assertProjectOwner` as the **sole** project/task grant are superseded as in FR-003–FR-005
- Then no dashboard behavior is specified or implemented from this folder; no `specs/005-audit/` is created; no mail, public share link, comments, or AI

### Scenario AC-011: Frontend uses backend authorization

- Given the running frontend and an authenticated authorized member
- When they use existing `/projects` and `/projects/:projectId` flows allowed by their role
- Then the UI calls `VITE_API_URL` with `credentials: 'include'`, does not store a bearer token in JS, does not treat hidden UI as authorization, and does not redesign workspace UI
- Then member management is a Dialog on the project board header; there is no `/members` page and no workspace-ui redesign
- Then OWNER chrome includes Edit, Archive/Unarchive, Members Dialog, and full task/Kanban writes; EDITOR chrome includes Edit and full task/Kanban writes but not Archive/Unarchive or membership admin; VIEWER chrome is read/list of project and tasks (no Edit, Archive, add-task, or DnD writes)
- Guest login/register still have no product sidebar

### Scenario AC-012: Sensitive data stays off the wire

- Given any membership, project, or task success or failure response for this feature
- When the body is inspected
- Then failures use the error envelope, and never include password hashes, secrets, stack traces, session ids in JSON, or database connection data

### Scenario AC-013: Automated checks

- Given the new domain, changed authorization, and relevant UI tests
- When the documented commands are run
- Then membership uniqueness, matrix policy, and authz-vs-auth tests pass without HTTP or Prisma, and Vitest, Testing Library, and SuperTest checks for this feature pass, including existing auth, profile, health/ready, and probe cases that this feature must not break

### Scenario AC-014: Draft gate and recorded answers

- Given these artifacts are Draft
- When implementation is requested
- Then work MUST stop at the approval gate
- Given Q-051–Q-057 are Decided
- When implementation later proceeds after explicit approval
- Then role names, matrix, add-by-email, owner-row rules, HTTP/schema contract, board-header Dialog, and archived GET MUST match those recorded answers and MUST NOT be contradicted

### Scenario AC-015: Archived GET is ownerUserId only

- Given an archived project P and authenticated member M whose id is not `P.ownerUserId`
- When M `GET /api/projects/:id` for P, or lists/creates tasks on P, or calls P’s membership routes
- Then the API responds `403`
- Given the user whose id equals `P.ownerUserId`
- When they `GET` P
- Then the API responds `200` with the public project DTO including non-null `archivedAt`
- Default `GET /api/projects` still excludes P for every caller. There is no `includeArchived` query.

### Scenario AC-016: Owner membership cannot be removed; last OWNER preserved

- Given project P with `ownerUserId` U
- When an OWNER tries to `DELETE` U’s membership
- Then the API responds `409` `{ error: { code: "CONFLICT", message } }` and U remains a member
- When an OWNER tries to `PATCH` U’s role away from `OWNER`
- Then the API responds `409` and U remains `OWNER`
- When an OWNER tries to remove or demote the last OWNER in a way that would leave the project with no OWNER
- Then the API responds `409` and membership is unchanged
- Owner transfer (`ownerUserId` change) is not offered

### Scenario AC-017: Membership HTTP contract

- Given an OWNER of existing project P
- When they `GET /api/projects/:projectId/members`
- Then `200` `{ members: PublicMemberDto[] }` (empty array when only the contract collection is empty after filters — after create, the owner row is present)
- When they `PATCH /api/projects/:projectId/members/:userId` with `{ role }` for a member who is not `ownerUserId`
- Then `200` returns the updated public member DTO
- When they `DELETE /api/projects/:projectId/members/:userId` for a member who is not `ownerUserId` and is not the last OWNER
- Then `204` with an empty body and the membership row is gone
- When `:userId` is not a member of P
- Then `404` `NOT_FOUND`
- Invalid body (unknown fields, invalid role, invalid email) → `400` `VALIDATION_ERROR`

## 7. Business Rules

- A project still has exactly one creating owner persisted as `ownerUserId`; the client cannot assign it; owner transfer is out of scope — owning domain: `projects`
- `ownerUserId` grants OWNER powers even without a membership row — owning domain: `project-members` (policy) + `projects` (owner field)
- Creating a project inserts an OWNER membership for the creating actor — owning domains: `projects` (create) + `project-members` (row)
- Membership is a distinct association between an existing user and a project with role `OWNER` | `EDITOR` | `VIEWER` — owning domain: `project-members`
- The same user MUST NOT have two memberships on the same project — owning domain: `project-members`
- Only OWNER may add, remove, or change roles — owning domain: `project-members`
- The `ownerUserId` user MUST NOT be removed from membership and MUST NOT be demoted from OWNER — owning domain: `project-members`
- A project MUST NOT be left with no OWNER — owning domain: `project-members`
- Members are existing users only; add is email lookup without mail; unknown email is not-found, not an invite — owning domain: `project-members`
- Authentication proves identity; it does not grant project or task access — owning domains: `auth` (authentication), `project-members` (permission checks), `projects` / `tasks` (resource use cases)
- Resource-level authorization for shared access lives in the backend — owning domain: `project-members` (policy), enforced before `projects` / `tasks` mutations
- Default authorized project list excludes archived projects; no `includeArchived` — owning domain: `projects`
- Only `ownerUserId` may GET an archived project; non-owner members MUST NOT — owning domain: `projects` + `project-members`
- Task writes on an archived parent conflict (`409`) only when the actor is otherwise authorized; non-owner members get `403` on archived projects — owning domain: `tasks`
- Soft-deleted tasks stay not-found; no restore API — owning domain: `tasks`
- `project-members` MUST NOT use another domain’s Prisma repository class; `projects` MUST NOT depend on `project-members` internals; `auth` middleware MUST NOT decide membership — owning domains: `project-members`, `projects`, `auth`
- Dashboard, audit ID `005`, email invite, public links, comments, and AI are not rules of this feature

## 8. Data

**Project membership** (owned by `project-members`)

- Meaning: a persisted association that grants a user an explicit role on a project.
- Identity: system-assigned unique identifier.
- Associations: existing user id; existing project id.
- Role: explicit enum `OWNER` | `EDITOR` | `VIEWER`.
- Uniqueness: at most one membership per (`projectId`, `userId`).
- Lifecycle: created when a member is added, and when a project is created (OWNER row for `ownerUserId`); removed when a member is removed. No pending invite state. No mail metadata.
- Deletion: removing membership deletes the membership row only. User/Project FKs MUST NOT cascade-delete those rows (`Restrict`).
- List identity shown to clients: membership `id`, `userId`, `email`, `displayName` (already on `User`; not a new `name` field), `role`, `createdAt`.

**Project** (owned by `projects`)

- Unchanged fields from `003-projects`: identity, `ownerUserId`, `name`, optional `description`, `createdAt`, nullable `archivedAt`.
- Listing semantics **change**: authorized active set includes projects the actor may see via membership or ownership (FR-005), not only owned rows.
- Owner transfer is out of scope.

**Task** (owned by `tasks`)

- Unchanged from `004-tasks`. No assignee field. Authorization of access changes; stored shape does not.

**User** (owned by `users`)

- Unchanged identity/profile (`id`, `email`, `displayName`). No User schema column for membership. Member list reuses `email` and `displayName`.

**Session / password credential / system probe**

- Unchanged.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. `credentials: 'include'`. CORS origin with credentials, not `*`.

The backend MUST provide:

- Existing project create/list/GET/PATCH/archive/unarchive, with authorization upgraded from owner-only to the Q-052 matrix (and Q-057 for archived GET).
- Existing task create/list/filter/GET/PATCH/soft-delete, with authorization upgraded the same way.
- Membership HTTP (Q-055): `GET` and `POST /api/projects/:projectId/members`; `PATCH` and `DELETE /api/projects/:projectId/members/:userId`.
- Existing auth, users, health, ready, and probe routes unchanged.

HTTP schemas (DTOs, status details) belong in `plan.md`.

Error responses MUST use `{ error: { code, message } }` plus HTTP status. Reuse `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`. Do not invent extra error codes.

There are no third-party identity, mail, or share-link integrations in this feature.

## 10. Security

- Authentication and authorization MUST remain distinct.
- Protected project, task, and membership operations MUST be enforced in the backend. Hiding UI is not authorization.
- Authorization MUST be resource-level (this project, this task’s parent project), not “any authenticated user.”
- External input MUST be validated with Zod at the HTTP boundary.
- Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard, and MUST allow credentials.
- The session cookie remains HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture is unchanged (`SameSite=Lax`, origin allowlist, JSON bodies).
- Database credentials stay in backend/runtime env only.
- No public unauthenticated project, task, or membership read via share link.
- No SMTP credentials or mail sending.
- Unknown email on add-member is `404`; it MUST NOT create a user or send mail.

## 11. Non-Functional

- Membership Dialog on the board header MUST be usable enough to add/list/change/remove members; visual polish and workspace redesign are out of scope.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- TypeScript strictness SHOULD catch boundary and domain typing issues.
- Numeric performance targets are not specified.
- No pagination product feature in this slice.
- No new npm dependencies expected (no mailer, no second CSS framework, no extra DnD library).

## 12. Dependencies

- Existing features: `001-foundation` through `007-workspace-ui` Verified. `008-dashboard` is Draft and **must not be specified here**. Present: Compose `frontend`/`backend`/`db`; domains `system`, `auth`, `users`, `projects`, `tasks`; `Project.ownerUserId`; `ProjectAccessPort.requireOwnedProject`; cookie `devtrack_session`; `UsersIdentityPort.findByEmail`; User `displayName`; copied shadcn `dialog`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete; no circular domain dependencies; atomic create-project + owner membership via a transaction.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS with credentials; Argon2id; React Router 7; Tailwind + copied shadcn; `@dnd-kit/core`.
- New dependencies: none expected. Do not add nodemailer, SMTP, or a share-link library.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session: `401`; no data.
- Authenticated but not authorized on an existing live project: `403`; no data change.
- Unknown project id: `404`.
- Unknown or soft-deleted task: `404` for every caller.
- Invalid JSON/body, unknown fields, invalid ids, invalid email format, invalid role: `400` `VALIDATION_ERROR`.
- Duplicate membership for the same user and project: `409` `CONFLICT`; one row remains.
- Add member targeting a non-existent email: `404` `NOT_FOUND`; do not create a user; do not send mail.
- Member `:userId` not on the project: `404`.
- Cannot remove or demote `ownerUserId`; cannot leave zero OWNER: `409` `CONFLICT`.
- Task write on archived parent when otherwise authorized (`ownerUserId`): `409` `CONFLICT`.
- Non-owner member accessing archived project (GET, tasks, members): `403`.
- Empty authorized project list: `200` with `{ projects: [] }`.
- Empty members collection: `200` with `{ members: [] }` (create-project always inserts the owner, so a freshly created project is not empty).
- Database unreachable: `503` with envelope; no secrets leaked.
- Implementation while Draft or contradicting Q-051–Q-057: not allowed; stop and return to planning.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002, FR-008 | AC-006, AC-017 | Add by email; no mail; 404/409 |
| FR-003, FR-005 | AC-001, AC-008 | List/GET beyond owner-only; owner row on create |
| FR-004, FR-007 | AC-003, AC-004, AC-007 | Task parent authz; 403 vs 404 |
| FR-006 | AC-002 | 401; auth ≠ authz |
| FR-009, FR-010 | AC-009 | `project-members`; ports; additive migration |
| FR-011, FR-015 | AC-010, AC-011 | Existing slices; Dialog; no dashboard/audit/mail |
| FR-012 | AC-012 | Envelope; no secrets |
| FR-013, FR-014 | AC-013 | Executed tests |
| FR-016 | AC-015 | Archived GET `ownerUserId` only |
| FR-017 | AC-016 | Cannot remove owner; last OWNER |
| Q-051, Q-052 | AC-005, AC-014 | Matrix encoded, not invented |

## 15. Open Questions

### Decided for this feature

- **Q-051:** Role catalog. Owner: product. Status: **Decided**. Explicit enum `OWNER`, `EDITOR`, `VIEWER`. No other roles in this feature.
- **Q-052:** Permission matrix. Owner: product + `project-members`. Status: **Decided**. OWNER: all project/task/membership-admin operations. EDITOR: view + `PATCH` project `name`/`description` + full task CRUD; no archive/unarchive; no membership admin. VIEWER: project and task read/list only. `Project.ownerUserId` grants OWNER powers even without a membership row. Roster `GET` members is allowed for any actor authorized to GET that project (so the board can apply role chrome without a role field on `PublicProjectDto`). Creating owner association is unchanged (client cannot set `ownerUserId`).
- **Q-053:** How members are added without mail. Owner: product + `project-members`. Status: **Decided**. Add member by **email of an existing user**. `POST` body `{ email, role }`. Lookup existing user by email. Do not send mail. No invite tokens. Unknown email → `404` `NOT_FOUND`. Person must already be registered. Do not create an account.
- **Q-054:** Owner membership and removal. Owner: product + `project-members` + `projects`. Status: **Decided**. Insert the creating owner as an OWNER membership row. Only OWNER may add/remove/change roles. Cannot remove the `ownerUserId` user. Cannot leave the project with no OWNER. Owner transfer is out of scope.
- **Q-055:** Membership HTTP and persistence contract. Owner: architecture + `project-members`. Status: **Decided**. `GET` and `POST /api/projects/:projectId/members`. `PATCH` and `DELETE /api/projects/:projectId/members/:userId`. Prisma model `ProjectMember`: `id`, `projectId`, `userId`, role enum, `createdAt`, unique (`projectId`, `userId`), FKs `Restrict`. Duplicate member → `409`. Unknown user → `404`. Public member DTO uses membership identity plus user `id`/`email`/`displayName` (already on `User`) and `role`. Do not add extra DTO fields. Do not add a role field to `PublicProjectDto`.
- **Q-056:** Frontend membership surface. Owner: product + frontend. Status: **Decided**. Member management UI is a **Dialog on the project board header**. No new members page. No workspace-ui redesign. Authorized members use existing `/projects` and `/projects/:projectId` per their role.
- **Q-057:** Archived project access for members. Owner: product + `projects`. Status: **Decided**. Non-owner members MUST NOT `GET` an archived project by id. Only `ownerUserId` may `GET` archived. Default list still excludes archived. Do not add `includeArchived`.

### Deferred (not required to implement this feature)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Later product work (do not specify here)

- Dashboard (`008-dashboard`). Out of this folder.
- Invite by email (`proposed-features.md` **M**), email digest, public share links.
- App-wide CRUD audit. Later ID, **not** `005`/`006`/`007`. Do not write `specs/005-audit/`.
- Comments, notifications, labels, AI. See `proposed-features.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-051–Q-057 are Decided
- Approved for planning: Yes
- Approved for implementation: Yes
