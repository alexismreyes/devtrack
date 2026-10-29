# Feature Specification: Tasks

- **ID:** 004-tasks
- **Status:** Verified
- **Created:** 2026-10-29
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

Q-022, Q-023, Q-024, Q-025, Q-026, and Q-027 are answered and recorded below. Artifacts are Approved; implementation may proceed on T001–T017 only. Do not create `005-audit` artifacts in this feature.

## 1. Problem

Projects are verified, but DevTrack still has no persisted work items inside a project. Users cannot create, inspect, change, list, filter, or soft-delete tasks with title, description, status, priority, and optional due date, and later Kanban, dashboard, and collaboration slices have nothing to attach to.

The constitution already requires resource-level authorization in the backend, a modular monolith, Prisma only behind owning-domain repositories, and no leak of secrets, hashes, or stack traces. Project authorization is owner-only. Those rules are not yet applied to tasks.

## 2. Goals

- Let an authenticated project owner create a task associated with a project they own.
- Let that owner read, update, list, filter, and soft-delete those tasks through the backend, not only in the UI.
- Persist title, optional description, status, priority, and optional due date with the decided enumerations and defaults.
- Let the owner optionally filter the project task list by `status` and/or `priority`.
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to another user’s project tasks.
- Keep verified `system`, `auth`, `users`, and `projects` behavior. Do not add task or user ownership to `SystemProbe`. Do not add `project-members`.

## 3. Non-Goals

- Kanban board layout, status columns as a board, or drag-and-drop.
- Dashboard aggregates (pending, completed, overdue counts).
- Collaboration, membership, invitations, shared access, or `project-members`.
- Assignees, comments, labels, tags, attachments, subtasks, or activity history.
- App-wide CRUD audit logging (`005-audit`); it is proposed later work, not this feature.
- Changing register, login, logout, own-profile, health, readiness, probe, or project contracts except wiring the new `tasks` routes and a narrow project-access port.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- A frontend routing library or design system (Q-016 remains deferred; view/state switching is enough).
- Production image design, CI, or deployment (Q-006, Q-009).
- Password complexity, lockout, or probe retention (Q-015, Q-017, Q-007).
- Hard-deleting a task row, a restore/un-delete HTTP endpoint, or an `includeDeleted` list filter.
- Moving a task to another project after create.

## 4. Actors and User Stories

### User Story US-001

As a project owner, I want to create a task on a project I own, so that planned work is persisted with that project.

### User Story US-002

As a project owner, I want to read a task on a project I own, so that I can see its title, description, status, priority, and due date.

### User Story US-003

As a project owner, I want to update a task on a project I own, so that I can change its title, description, status, priority, and optional due date without changing its project.

### User Story US-004

As a project owner, I want to list the tasks for a project I own, so that I can see the work associated with that project.

### User Story US-005

As a project owner, I want to optionally filter that list by status and/or priority, so that I can narrow tasks without using another user’s data.

### User Story US-006

As a project owner, I want other authenticated users to be unable to create, read, update, list, filter, or soft-delete tasks on my project, so that authentication is not treated as authorization.

### User Story US-007

As a developer, I want existing auth, profile, project, and system-probe flows to keep working, so that verified slices are not lost when tasks are added.

### User Story US-008

As a project owner, I want to soft-delete a task so it leaves my list and can no longer be read, without a hard-delete of the database row and without a restore API.

## 5. Functional Requirements

- **FR-001:** An authenticated owner of a project MUST be able to create a task associated with that project. The client MUST supply the project association through the create path. Unauthenticated callers MUST NOT create tasks. An authenticated non-owner MUST NOT create tasks on another user’s project. Create against an archived parent project MUST fail as conflict.
- **FR-002:** A created task MUST have a system-assigned unique identity, a system-assigned created time, a `projectId`, a required `title`, an optional `description`, a `status`, a `priority`, an optional due date, and a nullable `deletedAt` that is null on create. `title` values NEED NOT be unique, including per project. This feature MUST NOT invent additional product fields (no assignee, comments, labels, owner copy on the task, or audit log). There are no additional length or complexity rules beyond `title` required and non-empty after trim.
- **FR-003:** `status` MUST be one of `TODO`, `IN_PROGRESS`, `DONE`. `priority` MUST be one of `LOW`, `MEDIUM`, `HIGH`. Any of those statuses MAY be set; this slice MUST NOT add a workflow that forces a particular sequence. On create, `status` and `priority` MAY be omitted; omitted `status` MUST default to `TODO` and omitted `priority` MUST default to `MEDIUM`. If the client supplies them, they MUST be valid enumerations. Null `status` or `priority` on create is validation failure, not a default.
- **FR-004:** Create and update MUST reject missing or empty `title` (after trim) and MUST reject unknown or server-owned fields (including `id`, `createdAt`, `deletedAt`, and `projectId` in the body) with validation failure. `description` MAY be omitted; omitted, null, or blank (after trim) `description` MUST be stored as null. Due date MAY be omitted; omitted or null stores null. Invalid `status`, `priority`, or due date MUST fail validation. Past due dates are allowed; overdue presentation is out of scope.
- **FR-005:** An authenticated owner of the parent project MUST be able to read a non-deleted task by id, including when that parent project is archived. Unauthenticated callers MUST fail as unauthenticated. An authenticated non-owner MUST fail as forbidden. A request for a task id that does not exist, or for a task whose `deletedAt` is set, MUST fail as not found. A create or list against a project id that does not exist MUST fail as not found.
- **FR-006:** An authenticated owner of the parent project MUST be able to update `title` and/or `description` and/or `status` and/or `priority` and/or due date of a non-deleted task they are authorized to access, unless the parent project is archived. Update MUST NOT change `id`, `createdAt`, `projectId`, or `deletedAt`. `projectId` is immutable after create; PATCH MUST reject `projectId` as validation failure. Non-owners MUST NOT update. Unauthenticated callers MUST NOT update. Update of a deleted task MUST fail as not found. Update against an archived parent MUST fail as conflict.
- **FR-007:** An authenticated owner MUST be able to list non-deleted tasks for a project they own, including when that project is archived. The list MUST include only non-deleted tasks associated with that project. The caller MUST NOT see another user’s project tasks. Unauthenticated callers MUST NOT list tasks. There is no global task directory in this slice. An empty authorized list MUST be success with an empty collection, not an error. The list MAY be filtered by optional `status` and/or `priority` query parameters. Invalid filter values MUST fail validation. Unknown query parameters MUST fail validation. There is no due-date filter and no `includeDeleted` filter.
- **FR-008:** Authentication (proving who the caller is) MUST remain distinct from authorization (whether that caller owns the parent project). Passing authentication MUST NOT by itself grant access to another user’s tasks. Authorization in this slice is project ownership, the same rule as `003-projects`. This feature MUST NOT add membership or shared access.
- **FR-009:** Protected task operations MUST require a valid session cookie (`devtrack_session`). Missing, malformed, expired, revoked, or unknown cookies MUST fail as unauthenticated. `GET /health` and `GET /ready` MUST remain public. Probe, auth, profile, and project contracts MUST remain as in `003-projects` (probes remain authenticated).
- **FR-010:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- **FR-011:** The backend MUST remain a modular monolith. `tasks` MUST own task persistence, task invariants, and task use cases. `projects` MUST keep owning project persistence, archive lifecycle, and project-owner authorization, exposing a narrow access port for `tasks`. `auth` MUST keep owning sessions and authentication middleware. `users` MUST keep owning identity and profile. `system` MUST keep owning probes and readiness. A generic repository MUST NOT be introduced. `project-members` MUST NOT be created.
- **FR-012:** Prisma MUST be used only behind the owning domain’s repository. Task persistence MUST be added under `backend/prisma/` with a versioned additive migration. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be used as domain entities or public DTOs. `tasks` MUST NOT import the `projects` Prisma repository implementation.
- **FR-013:** The React UI MUST provide create, list, filter, read, update, and soft-delete flows for tasks on the currently selected owned project, with loading, empty, success, validation/error, forbidden, unauthenticated, and archived-parent conflict states. The browser MUST keep using the published backend port, `VITE_API_URL`, and `fetch` `credentials: 'include'`. The frontend MUST NOT be the only access check. The frontend MUST NOT store a bearer token in JS. View/state switching MUST be used; a routing library MUST NOT be introduced (Q-016).
- **FR-014:** Domain identity, project association, authorization, status, priority, defaults, immutability of `projectId`, and soft-delete behavior MUST be testable without HTTP or Prisma. Task API behavior and critical task UI behavior MUST also be tested with Vitest, Testing Library, and SuperTest.
- **FR-015:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified in `001-foundation`, `002-authentication`, and `003-projects`.
- **FR-016:** Task end-of-life in this slice is a soft-delete. An authenticated owner of a non-archived parent project MUST be able to soft-delete a non-deleted task they are authorized to access. Soft-delete MUST persist `deletedAt` as a timestamp and MUST NOT remove the database row. There is no un-delete or restore HTTP endpoint; restore is database-only and out of API scope. Soft-delete of a missing or already-deleted task MUST fail as not found. Soft-delete by a non-owner MUST fail as forbidden. Soft-delete against an archived parent MUST fail as conflict. Soft-delete MUST NOT be a hard-delete of the row.
- **FR-017:** When the parent project is archived, owner GET of a non-deleted task and owner list (including filters) MUST still succeed. Owner create, update, and soft-delete MUST fail as conflict (`409` `{ error: { code: "CONFLICT", message } }`) and MUST NOT persist changes.
- **FR-018:** Due date is a calendar date (no time-of-day) when present. Dashboard overdue counts are out of scope.
- **FR-019:** App-wide CRUD audit logging is out of scope for this feature. Do not add audit tables, events, or request logging of task CRUD beyond existing error handling.

## 6. Acceptance Criteria

### Scenario AC-001: Successful create

- Given an authenticated owner of an active project
- When they create a task with a non-empty `title` and optional `description` and due date, omitting `status` and `priority`
- Then a task is persisted with a system-assigned id, `createdAt`, `projectId` equal to that project, `status` `TODO`, `priority` `MEDIUM`, `deletedAt` null, the API responds `201` with the public task DTO and no secrets, and later authorized reads return that task
- When they instead supply a valid `status` and/or `priority` on create
- Then those supplied values are persisted instead of the defaults

### Scenario AC-002: Unauthenticated create

- Given a caller with no valid session cookie
- When they try to create a task
- Then the API responds `401` with `{ error: { code: "UNAUTHENTICATED", message } }` and no task is persisted

### Scenario AC-003: Create validation

- Given an authenticated project owner
- When they create a task with missing or empty `title` (after trim), unknown fields, server-owned fields such as `id`, `createdAt`, `deletedAt`, or body `projectId`, null `status` or `priority`, or an invalid `status`, `priority`, or due date
- Then the API responds `400` with `{ error: { code: "VALIDATION_ERROR", message } }` and no task is persisted

### Scenario AC-004: Owner read

- Given an authenticated owner of a project that has a non-deleted task
- When they request that task by id
- Then the API responds `200` with the public task DTO for that task, including `id`, `projectId`, `title`, `description`, `status`, `priority`, due date, and `createdAt`, and not including `deletedAt`

### Scenario AC-005: Unauthenticated protected task access

- Given a caller with no session cookie, or a malformed, expired, revoked, or unknown session cookie
- When they create, list, read, update, or soft-delete a task
- Then the API responds `401` with `{ error: { code, message } }` and does not return task data or persist changes

### Scenario AC-006: Non-owner is forbidden

- Given user A owns a project with a non-deleted task and user B is authenticated
- When B tries to create a task on A’s project, or read, update, list, or soft-delete A’s project tasks
- Then the API responds `403` with `{ error: { code: "FORBIDDEN", message } }`, A’s tasks are unchanged, and the response does not grant access to A’s task as a successful body

### Scenario AC-007: Missing project or task

- Given an authenticated user
- When they create or list against a project id that does not exist, or read, update, or soft-delete a task id that does not exist
- Then the API responds `404` with `{ error: { code: "NOT_FOUND", message } }`

### Scenario AC-008: Owner update

- Given an authenticated owner of an active project that has a non-deleted task
- When they update it with a valid `title` and/or `description` and/or `status` and/or `priority` and/or due date
- Then those fields are persisted, later reads return them, and `id`, `createdAt`, and `projectId` are unchanged
- When they send `id`, `createdAt`, `projectId`, `deletedAt`, or other disallowed fields
- Then the API rejects the request as validation (`400`) and does not change identity, created time, project association, or deletion state

### Scenario AC-009: Authorized list includes only that project’s non-deleted tasks

- Given authenticated user A who owns a project with at least one non-deleted task and user B who owns a different project with a task
- When A lists tasks for A’s project
- Then the API responds `200` with A’s non-deleted tasks for that project and MUST NOT include B’s tasks or any soft-deleted tasks
- When a project has no non-deleted tasks
- Then the API responds `200` with an empty list, not an error

### Scenario AC-010: Unauthenticated list

- Given a caller with no valid session
- When they list tasks
- Then the API responds `401` and does not return any tasks

### Scenario AC-011: Status and priority enumerations

- Given an authenticated project owner creating or updating a task
- When they supply `status` `TODO`, `IN_PROGRESS`, or `DONE`, and `priority` `LOW`, `MEDIUM`, or `HIGH`
- Then those values are persisted and returned
- When they supply any other status or priority
- Then the API responds `400` `VALIDATION_ERROR` and does not persist the invalid value
- This slice MUST NOT require a particular status sequence

### Scenario AC-012: Sensitive data stays off the wire

- Given any task success or failure response
- When the body is inspected
- Then failures use the error envelope, and never include password hashes, secrets, stack traces, session ids in JSON, or database connection data

### Scenario AC-013: Architecture path

- Given create, read, update, list, or soft-delete is exercised
- When the request is handled
- Then control flows React UI → HTTP → Express route → `tasks` controller → `tasks` service → `tasks` repository → Prisma → PostgreSQL for task persistence, project authorization uses a narrow `projects` access port rather than the `projects` Prisma repository, authentication middleware does not perform project or task authorization, and Prisma types are not used as domain entities or public DTOs

### Scenario AC-014: Frontend task flows

- Given the running frontend and an authenticated project owner
- When they create, list, filter, open, update, and soft-delete a task on a selected owned project, and when the list is empty
- Then the UI covers loading, empty, success, and error/unauthenticated/forbidden/conflict states, calls the backend at `VITE_API_URL` with `credentials: 'include'`, does not store a bearer token in JS, does not treat hidden UI as authorization, does not introduce a client-side router (Q-016), and does not present Kanban drag-and-drop

### Scenario AC-015: Automated checks

- Given the new domain, API, and UI tests
- When the documented commands are run
- Then association, authorization, status, priority, defaults, immutability of `projectId`, and soft-delete tests pass without HTTP or Prisma, and Vitest, Testing Library, and SuperTest checks for this feature pass, including existing auth, profile, project, health/ready, and probe cases

### Scenario AC-016: Existing slices remain

- Given the verified foundation, authentication, and projects slices
- When this feature is implemented
- Then register, login, logout, own-profile, project create/list/read/update/archive/unarchive, `GET /health`, `GET /ready`, and authenticated probes still behave as in `003-projects`, and `SystemProbe` still has no project, task, or user ownership field

### Scenario AC-017: Duplicate titles are allowed

- Given an authenticated owner who already has a task titled `X` on a project
- When they create another task titled `X` on that project
- Then the API responds `201` and both tasks persist
- When another owned project also gets a task titled `X`
- Then that create also succeeds; titles are not unique per project or globally

### Scenario AC-018: Optional due date

- Given an authenticated project owner
- When they create a task without a due date, or with due date null
- Then the persisted due date is null
- When they later set a valid calendar due date, including a date in the past
- Then that date is persisted and returned
- When they clear the due date
- Then later reads return null

### Scenario AC-019: Soft-delete hides the task

- Given an authenticated owner of an active project that has a non-deleted task
- When they soft-delete that task
- Then the API responds `204` with an empty body, the database row remains with `deletedAt` set, a later owner GET of that id responds `404` `NOT_FOUND`, a later list does not include it, a later update or second soft-delete responds `404`, and there is no restore HTTP endpoint
- When a non-owner tries to read that deleted task
- Then the API also responds `404`, not `403`

### Scenario AC-020: List filters by status and/or priority

- Given an authenticated owner of a project with several non-deleted tasks of mixed status and priority
- When they list with no query parameters
- Then the API responds `200` with all non-deleted tasks for that project
- When they list with `status` and/or `priority` query parameters using valid enumerations
- Then the API responds `200` with only matching non-deleted tasks for that project
- When they supply an invalid `status` or `priority`, or an unknown query parameter
- Then the API responds `400` `VALIDATION_ERROR`

### Scenario AC-021: Archived parent project

- Given an authenticated owner of an archived project that has a non-deleted task
- When they GET that task or list (including with valid filters)
- Then the API responds `200` with the non-deleted task data
- When they create, update, or soft-delete a task on that project
- Then the API responds `409` `{ error: { code: "CONFLICT", message } }` and no task data changes

## 7. Business Rules

- A task has a system-assigned identity and created time — owning domain: `tasks`
- A task is associated with exactly one project via `projectId`; `projectId` is immutable after create — owning domain: `tasks` (association); `projects` (project existence)
- Only the owner of the parent project may create, read, update, list, filter, or soft-delete the task — owning domain: `projects` (ownership), `tasks` (enforcing via the access port)
- Authentication proves identity; it does not grant access to another user’s tasks — owning domains: `auth` (authentication), `projects` (ownership), `tasks` (authorization check at use-case boundary)
- Client-supplied fields are required `title`, optional `description`, optional `status`, optional `priority`, and optional due date; omitted create `status` defaults to `TODO`; omitted create `priority` defaults to `MEDIUM`; titles are not unique, including per project — owning domain: `tasks`
- `status` is `TODO` | `IN_PROGRESS` | `DONE`; `priority` is `LOW` | `MEDIUM` | `HIGH`; no status workflow — owning domain: `tasks`
- Due date is an optional calendar date; past dates are allowed — owning domain: `tasks`
- Soft-delete sets `deletedAt` and MUST NOT remove the row; deleted tasks are not found on GET and are excluded from list; there is no restore API — owning domain: `tasks`
- When the parent project is archived, owner GET and list still succeed; create, update, and soft-delete conflict — owning domains: `projects` (archive lifecycle), `tasks` (write rejection)
- Assignees, comments, membership, and audit logging do not exist in this feature — owning domain: `tasks` (do not add); do not create `project-members`; do not specify `005-audit` here
- `tasks` MUST NOT use the `projects` Prisma repository class; `projects` MUST NOT depend on `tasks`; `auth` middleware MUST NOT decide task field access — owning domains: `tasks`, `projects`, `auth`
- System probes remain non-product records owned by `system` — owning domain: `system`

## 8. Data

**Task** (owned by `tasks`)

- Meaning: a persisted work item associated with one project.
- Identity: system-assigned unique identifier.
- Project association: `projectId`, required, refers to an existing project, immutable after create.
- Created time: system-assigned timestamp of persistence.
- Client-supplied fields: required `title` (non-empty after trim); optional `description` (omit/null/blank stored as null); optional `status` (default `TODO` on create); optional `priority` (default `MEDIUM` on create); optional due date (calendar date; omit/null stored as null). Titles need not be unique, including per project. No additional length or complexity rules.
- Status: `TODO`, `IN_PROGRESS`, `DONE` only.
- Priority: `LOW`, `MEDIUM`, `HIGH` only.
- Uniqueness: identity is unique. `title` is not unique.
- Deletion: nullable `deletedAt`. Null means not deleted. Soft-delete sets `deletedAt` and MUST NOT remove the row. Deleted tasks are hidden from list and treated as not found on GET, update, and a second soft-delete. No restore HTTP operation. No `includeDeleted` filter.
- Listing: default list is non-deleted tasks for one project the caller owns. Optional filters: `status` and/or `priority`. No pagination product feature.
- Ownership: not stored as a separate task owner field. Authorization uses parent project ownership.
- Public representation: does not include `deletedAt`.

**Project** (owned by `projects`)

- Unchanged from `003-projects` except a Prisma reverse relation to tasks that the `projects` repository MUST NOT select or mutate. Archived projects still allow owner GET and list of non-deleted tasks; they reject create, update, and soft-delete with conflict.

**User** (owned by `users`)

- Unchanged from `002-authentication`. Tasks do not store `ownerUserId`.

**Session / password credential / system probe**

- Unchanged from `002-authentication`.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. The browser uses the published backend port and `VITE_API_URL`. Frontend `fetch` MUST use `credentials: 'include'`. The backend MUST allow that frontend origin via CORS with credentials enabled.

The backend MUST provide these capabilities (HTTP paths and DTO field names belong in the plan):

- Authenticated create of a task on an owned active project with required `title`, optional `description`, optional due date, optional `status` (default `TODO`), optional `priority` (default `MEDIUM`).
- Authenticated list of non-deleted tasks for an owned project, including when archived, with optional `status` and/or `priority` query filters.
- Authenticated read of a non-deleted task by id, authorized by parent project ownership, including when the parent is archived.
- Authenticated update of `title`, `description`, `status`, `priority`, and due date on a non-deleted owned task whose parent is active; `id`, `createdAt`, `projectId`, and `deletedAt` are not updatable.
- Authenticated soft-delete of a non-deleted owned task whose parent is active, persisting `deletedAt` without removing the row. No restore endpoint. Not a hard-delete of the row.
- Create, update, and soft-delete against an archived parent: conflict.
- Existing auth, users, projects, health, ready, and probe routes remain as in `003-projects`. `GET /health` and `GET /ready` stay public; probes stay authenticated.

Error responses MUST use `{ error: { code, message } }` plus HTTP status.

There are no third-party task integrations in this feature.

## 10. Security

- Authentication and authorization MUST remain distinct. `auth` middleware authenticates; `tasks` authorizes by asking `projects` whether the actor owns the parent project.
- Protected task operations MUST be enforced in the backend. Hiding UI is not authorization.
- External input MUST be validated with Zod at the HTTP boundary.
- Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard, and MUST allow credentials.
- The session cookie remains HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture is unchanged from `003-projects` (HTTP-only cookie, `SameSite=Lax`, CORS origin allowlist with credentials, JSON bodies).
- Database credentials stay in backend/runtime env only.
- Public liveness and readiness remain intentional. Task routes MUST NOT be public. Probe routes remain authenticated as in `002-authentication`.
- Do not implement membership checks “for later.”
- Deleted tasks MUST NOT leak existence to non-owners via `403`; they behave as not found.

## 11. Non-Functional

- Create, list, filter, read, update, and soft-delete MUST be usable enough to complete the flows; visual polish is not required. Kanban interaction is out of scope.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- TypeScript strictness SHOULD catch boundary and domain typing issues.
- Numeric performance targets are not specified.
- No pagination product feature in this slice; list returns the authorized non-deleted tasks for one project, optionally filtered by status and/or priority.
- Q-016 remains deferred: project detail plus task list/detail/forms MUST work with in-app view/state switching.

## 12. Dependencies

- Existing features: `001-foundation` Verified; `002-authentication` Verified; `003-projects` Verified. Present in the repo: `frontend/`, `backend/`, Compose services `frontend`/`backend`/`db`, domains `system`, `auth`, `users`, `projects`, session cookie `devtrack_session`, CORS with credentials, error envelope including `NOT_FOUND` and `CONFLICT`, Prisma migrations `20261026120000_init_system_probe`, `20261026133000_authentication`, and `20261027120000_projects`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS for the frontend origin with credentials; Argon2id and cookie-parser already in the backend.
- New dependencies: none expected. Do not add a router, state library, extra ORM, Kanban library, or audit package.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session on task routes: `401`; no task data.
- Authenticated non-owner on another user’s live project or task: `403`; no data change.
- Unknown project id on create/list: `404`.
- Unknown task id, or a task with `deletedAt` set, on read/update/soft-delete: `404`.
- Invalid JSON/body, unknown fields, empty `title`, invalid enumerations, invalid due date, unknown query parameters, or server-owned fields (`id`, `createdAt`, `deletedAt`, body `projectId`): `400`; nothing persisted or changed.
- Empty authorized task list: `200` with an empty collection, not an error.
- Duplicate `title` for the same project or another project: allowed (`201`).
- Past due date: allowed.
- Archived parent, owner GET or list: `200`.
- Archived parent, owner create/update/soft-delete: `409` `CONFLICT`; no change.
- Database unreachable: `503` with envelope; no secrets leaked.
- Frontend cannot reach backend: UI error state; no database credentials involved.
- Second soft-delete of the same task: `404`.
- Restore: not offered over HTTP.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002 | AC-001, AC-002, AC-003, AC-017 | Create API + persistence; project association; duplicate titles allowed |
| FR-003, FR-004 | AC-001, AC-003, AC-008, AC-011, AC-018 | Validation, enumerations, defaults, optional due date |
| FR-005 | AC-004, AC-005, AC-006, AC-007, AC-019, AC-021 | Read 200/401/403/404; deleted is 404; archived GET allowed |
| FR-006 | AC-008 | Update allowed fields; identity and `projectId` immutable |
| FR-007, FR-008 | AC-006, AC-009, AC-010, AC-020 | List project-only non-deleted; filters; 401/403 |
| FR-009, FR-015 | AC-005, AC-016 | Session required; existing slices remain |
| FR-010, FR-012 | AC-012, AC-013 | Envelope; module layout; migration |
| FR-011 | AC-013 | `tasks` module; project access port; no generic repository |
| FR-013 | AC-014 | Frontend tests + `credentials: 'include'` |
| FR-014 | AC-015 | Executed Vitest / Testing Library / SuperTest |
| FR-016 | AC-019 | Soft-delete sets `deletedAt`; GET/list hide it; no restore |
| FR-017 | AC-021 | Archived parent: GET/list 200; writes 409 |
| FR-018 | AC-018 | Calendar due date; past allowed |
| FR-019 | AC-016 | No audit tables or CRUD audit feature |

## 15. Open Questions

### Answered for this feature (no longer blocking)

- **Q-022:** Soft-delete via nullable `deletedAt`. Deleted tasks are hidden from list and GET (API behaves as `404` / not found). No un-delete/restore endpoint; restore only via the database. The HTTP operation is `DELETE /api/tasks/:id`, which sets `deletedAt` and MUST NOT remove the row. This is not a hard-delete of the row and not the projects archive/unarchive pattern. Owner: product + `tasks`. Status: Answered 2026-10-29.
- **Q-023:** Optional query filters on the project task list: `status` and/or `priority`. No due-date filter. No `includeDeleted`. Owner: product + `tasks`. Status: Answered 2026-10-29.
- **Q-024:** When the parent project is archived: GET and list of non-deleted tasks still work; create, update, and soft-delete return `409` `CONFLICT`. Owner: product + `projects` + `tasks`. Status: Answered 2026-10-29.
- **Q-025:** Required `title`; optional `description` and due date. On create, omitted `status` defaults to `TODO`; omitted `priority` defaults to `MEDIUM`. Owner: product + `tasks`. Status: Answered 2026-10-29.
- **Q-026:** `projectId` is immutable after create; PATCH MUST NOT change it and MUST reject it in the body. Owner: product + `tasks`. Status: Answered 2026-10-29.
- **Q-027:** App-wide CRUD audit logging is out of this feature. Record it as proposed later work (`005-audit`), not as `004-tasks` scope. Do not write `005-audit` artifacts in this feature. Owner: product + architecture. Status: Answered 2026-10-29.

### Deferred (not required to implement this feature)

- **Q-016:** Frontend routing library and styling. Owner: frontend. Status: Deferred from `001-foundation`. This feature MUST NOT require introducing a router; view/state switching is enough.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Still deferred from earlier features (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.

### Later product work (do not specify here)

- App-wide CRUD audit logging. Owner: `005-audit`. Status: Proposed; out of scope for `004-tasks`. Do not write those artifacts yet.
- Kanban columns and drag-and-drop. Owner: Kanban. Status: Unresolved; out of scope for `004-tasks`.
- Dashboard aggregates. Owner: dashboard. Status: Unresolved; out of scope for `004-tasks`.
- Project membership roles and permissions. Owner: collaboration / `project-members`. Status: Unresolved; out of scope for `004-tasks`.
- Assignees and comments. Owner: later task/collaboration work. Status: Unresolved; out of scope for `004-tasks`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-022, Q-023, Q-024, Q-025, Q-026, and Q-027 are recorded as answered
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T017)
- Independent review: PASS WITH NON-BLOCKING FINDINGS (AC-015 independently re-run by coordinator)
- Verified: Yes; deferred Q-006, Q-007, Q-009, Q-015, Q-016, Q-017 remain open; `005-audit` is later work
