# Feature Specification: Projects

- **ID:** 003-projects
- **Status:** Verified
- **Created:** 2026-10-27
- **Related features:** 001-foundation (Verified), 002-authentication (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

Q-019, Q-020, and Q-021 are answered and recorded below. Artifacts are Approved; implementation may proceed on T001–T017 only.

## 1. Problem

Authentication and users are verified, but DevTrack still has no product entity for work. Users cannot create, inspect, change, archive, or restore a project, and later task, Kanban, dashboard, and collaboration slices have nothing to attach to.

The constitution already requires resource-level authorization in the backend, a modular monolith, Prisma only behind owning-domain repositories, and no leak of secrets, hashes, or stack traces. Those rules are not yet applied to any product resource.

## 2. Goals

- Let an authenticated user create a project that is associated with them as owner.
- Let that owner read and update their project through the backend, not only in the UI.
- Let that owner archive a project (hard delete is out of scope) and later unarchive it.
- Let listing return only projects the caller is authorized to see (owner-only in this slice; membership is out of scope), excluding archived projects by default.
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to another user’s projects.
- Keep verified `system`, `auth`, and `users` behavior. Do not add project ownership to `SystemProbe`.

## 3. Non-Goals

- Tasks, Kanban, dashboard, collaboration, membership, or `project-members`.
- Membership roles, invitations, shared access, or owner transfer.
- Hard delete of a project (the in-scope end-of-life operations are archive and unarchive).
- An `includeArchived` (or equivalent) list query filter.
- Changing register, login, logout, own-profile, health, readiness, or probe contracts except wiring the new `projects` routes.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- A frontend routing library or design system (Q-016 remains deferred; view/state switching is enough).
- Production image design, CI, or deployment (Q-006, Q-009).
- Password complexity, lockout, or probe retention (Q-015, Q-017, Q-007).

## 4. Actors and User Stories

### User Story US-001

As an authenticated user, I want to create a project owned by me, so that my work has a persisted product container.

### User Story US-002

As a project owner, I want to read that project, so that I can see what I stored.

### User Story US-003

As a project owner, I want to update that project, so that I can change its name and description without changing ownership.

### User Story US-004

As a project owner, I want to archive a project, so that I can end its active lifecycle without a hard delete.

### User Story US-005

As an authenticated user, I want to list only projects I am authorized to see, so that other users’ projects are not exposed.

### User Story US-006

As a project owner, I want other authenticated users to be unable to read, update, archive, unarchive, or list my project, so that authentication is not treated as authorization.

### User Story US-007

As a developer, I want existing auth, profile, and system-probe flows to keep working, so that verified slices are not lost when projects are added.

### User Story US-008

As a project owner, I want to unarchive a project I archived, so that it becomes active again and I can update it and see it in the default list.

## 5. Functional Requirements

- **FR-001:** An authenticated user MUST be able to create a project. The owner MUST be the authenticated actor. The client MUST NOT supply or change `ownerUserId`. Unauthenticated callers MUST NOT create projects.
- **FR-002:** A created project MUST have a system-assigned unique identity, a system-assigned created time, an owner user id, a required `name`, and an optional `description`. `name` values NEED NOT be unique, including per owner. This feature MUST NOT invent additional product fields. There are no additional length or complexity rules beyond `name` required and non-empty after trim.
- **FR-003:** Create and update MUST reject missing or empty `name` (after trim) and MUST reject unknown or server-owned fields (including `id`, `ownerUserId`, `createdAt`, and `archivedAt`) with validation failure. `description` MAY be omitted; omitted, null, or blank (after trim) `description` MUST be stored as null.
- **FR-004:** An authenticated owner MUST be able to read a project they own, including after it is archived. Unauthenticated callers MUST fail as unauthenticated. An authenticated non-owner MUST fail as forbidden. A request for a project id that does not exist MUST fail as not found.
- **FR-005:** An authenticated owner MUST be able to update `name` and/or `description` of an active (not archived) project they own. Update MUST NOT change owner, id, created time, or `archivedAt`. Non-owners MUST NOT update. Unauthenticated callers MUST NOT update. An owner MUST NOT PATCH an archived project; they MUST unarchive it first.
- **FR-006:** An authenticated owner MUST be able to archive a project they own. Archive MUST persist `archivedAt` as a timestamp and MUST NOT hard-delete the row. Non-owners MUST NOT archive. Unauthenticated callers MUST NOT archive. Archiving an already archived project MUST leave `archivedAt` unchanged (idempotent).
- **FR-007:** An authenticated user MUST be able to list projects. The list MUST include only projects that caller is authorized to see. In this feature, authorization is ownership: the caller MUST NOT see another user’s projects. The default list MUST exclude archived projects (`archivedAt` is not null). This slice MUST NOT add an `includeArchived` query filter. Unauthenticated callers MUST NOT list projects. There is no global project directory.
- **FR-008:** Authentication (proving who the caller is) MUST remain distinct from authorization (whether that caller owns the project). Passing authentication MUST NOT by itself grant access to another user’s project.
- **FR-009:** Protected project operations MUST require a valid session cookie (`devtrack_session`). Missing, malformed, expired, revoked, or unknown cookies MUST fail as unauthenticated. `GET /health` and `GET /ready` MUST remain public. Probe, auth, and profile contracts MUST remain as in `002-authentication` (probes remain authenticated).
- **FR-010:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- **FR-011:** The backend MUST remain a modular monolith. `projects` MUST own project persistence, owner association, archive lifecycle, and resource-level project authorization. `auth` MUST keep owning sessions and authentication middleware. `users` MUST keep owning identity and profile. `system` MUST keep owning probes and readiness. A generic repository MUST NOT be introduced. `project-members` MUST NOT be created.
- **FR-012:** Prisma MUST be used only behind the owning domain’s repository. Project persistence MUST be added under `backend/prisma/` with a versioned additive migration. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be used as domain entities or public DTOs.
- **FR-013:** The React UI MUST provide create, list, read, update, archive, and unarchive flows for the caller’s projects, with loading, empty, success, validation/error, forbidden, and unauthenticated states. After archive, the current detail view MUST still allow the owner to see the archived project and unarchive it. The default list MUST NOT show archived projects. The browser MUST keep using the published backend port, `VITE_API_URL`, and `fetch` `credentials: 'include'`. The frontend MUST NOT be the only access check. The frontend MUST NOT store a bearer token in JS. View/state switching MUST be used; a routing library MUST NOT be introduced (Q-016).
- **FR-014:** Domain identity, ownership, authorization, and archive/unarchive behavior MUST be testable without HTTP or Prisma. Project API behavior and critical project UI behavior MUST also be tested with Vitest, Testing Library, and SuperTest.
- **FR-015:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified in `001-foundation` and `002-authentication`.
- **FR-016:** An authenticated owner MUST be able to unarchive a project they own by clearing `archivedAt`. After unarchive, owner PATCH of `name`/`description` MUST be allowed again and the project MUST appear in the default list. Non-owners MUST NOT unarchive. Unauthenticated callers MUST NOT unarchive. Unarchiving a project that is not archived MUST leave `archivedAt` null (idempotent).

## 6. Acceptance Criteria

### Scenario AC-001: Successful create

- Given an authenticated user
- When they create a project with a non-empty `name` and optional `description`
- Then a project is persisted with a system-assigned id, `createdAt`, `archivedAt` null, and `ownerUserId` equal to that user’s id, the API responds `201` with the public project DTO and no secrets, and later authorized reads return that project

### Scenario AC-002: Unauthenticated create

- Given a caller with no valid session cookie
- When they try to create a project
- Then the API responds `401` with `{ error: { code: "UNAUTHENTICATED", message } }` and no project is persisted

### Scenario AC-003: Create validation

- Given an authenticated user
- When they create a project with missing or empty `name` (after trim), unknown fields, or server-owned fields such as `id`, `ownerUserId`, `createdAt`, or `archivedAt`
- Then the API responds `400` with `{ error: { code: "VALIDATION_ERROR", message } }` and no project is persisted

### Scenario AC-004: Owner read

- Given an authenticated owner of a project
- When they request that project by id
- Then the API responds `200` with the public project DTO for that project, including `id`, `ownerUserId`, `name`, `description`, `createdAt`, and `archivedAt`

### Scenario AC-005: Unauthenticated protected project access

- Given a caller with no session cookie, or a malformed, expired, revoked, or unknown session cookie
- When they create, list, read, update, archive, or unarchive a project
- Then the API responds `401` with `{ error: { code, message } }` and does not return project data or persist changes

### Scenario AC-006: Non-owner is forbidden

- Given user A owns a project and user B is authenticated
- When B tries to read, update, archive, or unarchive A’s project
- Then the API responds `403` with `{ error: { code: "FORBIDDEN", message } }`, A’s project is unchanged, and the response does not grant access to A’s client-supplied fields as a successful body

### Scenario AC-007: Missing project

- Given an authenticated user
- When they read, update, archive, or unarchive a project id that does not exist
- Then the API responds `404` with `{ error: { code: "NOT_FOUND", message } }`

### Scenario AC-008: Owner update of an active project

- Given an authenticated owner of an active (not archived) project
- When they update it with a valid `name` and/or `description`
- Then those fields are persisted, later reads return them, and `id`, `ownerUserId`, `createdAt`, and `archivedAt` are unchanged
- When they send `ownerUserId`, `id`, `createdAt`, `archivedAt`, or other disallowed fields
- Then the API rejects the request as validation (`400`) and does not change owner or archive state

### Scenario AC-009: Authorized list includes only owned active projects

- Given authenticated user A who owns at least one active project and user B who owns a different project
- When A lists projects
- Then the API responds `200` with A’s authorized active projects and MUST NOT include B’s projects
- When a user with no active projects lists projects
- Then the API responds `200` with an empty list, not an error

### Scenario AC-010: Unauthenticated list

- Given a caller with no valid session
- When they list projects
- Then the API responds `401` and does not return any projects

### Scenario AC-011: Owner archive

- Given an authenticated owner of an active project
- When they archive that project
- Then the project is not hard-deleted, `archivedAt` is a non-null timestamp, the owner can still GET it (`200` with that `archivedAt`), the owner cannot PATCH it (`409` `{ error: { code: "CONFLICT", message } }` and fields unchanged), and the default list does not include it
- When a non-owner attempts the same archive
- Then they still receive `403` with no change

### Scenario AC-012: Sensitive data stays off the wire

- Given any project success or failure response
- When the body is inspected
- Then failures use the error envelope, and never include password hashes, secrets, stack traces, session ids in JSON, or database connection data

### Scenario AC-013: Architecture path

- Given create, read, update, list, archive, or unarchive is exercised
- When the request is handled
- Then control flows React UI → HTTP → Express route → `projects` controller → `projects` service → `projects` repository → Prisma → PostgreSQL for persistence, authentication middleware does not perform project authorization, and Prisma types are not used as domain entities or public DTOs

### Scenario AC-014: Frontend project flows

- Given the running frontend and an authenticated user
- When they create, list, open, update, archive, and unarchive a project they own, and when list is empty
- Then the UI covers loading, empty, success, and error/unauthenticated/forbidden states, after archive the detail view still shows the project and an unarchive action, the default list does not show archived projects, calls the backend at `VITE_API_URL` with `credentials: 'include'`, does not store a bearer token in JS, does not treat hidden UI as authorization, and does not introduce a client-side router (Q-016)

### Scenario AC-015: Automated checks

- Given the new domain, API, and UI tests
- When the documented commands are run
- Then ownership, authorization, and archive/unarchive tests pass without HTTP or Prisma, and Vitest, Testing Library, and SuperTest checks for this feature pass, including existing auth, profile, health/ready, and probe cases

### Scenario AC-016: Existing slices remain

- Given the verified foundation and authentication slices
- When this feature is implemented
- Then register, login, logout, own-profile, `GET /health`, `GET /ready`, and authenticated probes still behave as in `002-authentication`, and `SystemProbe` still has no project or user ownership field

### Scenario AC-017: Owner unarchive

- Given an authenticated owner of an archived project
- When they unarchive that project
- Then `archivedAt` is cleared (null), GET returns that project with `archivedAt` null, the default list includes it again, and a subsequent owner PATCH of `name` and/or `description` succeeds
- When a non-owner attempts the same unarchive
- Then they receive `403` with no change

### Scenario AC-018: Duplicate names are allowed

- Given an authenticated owner who already has a project named `X`
- When they create another project named `X`
- Then the API responds `201` and both projects persist
- When another authenticated user creates a project named `X`
- Then that create also succeeds; names are not unique per owner or globally

## 7. Business Rules

- A project has a system-assigned identity and created time — owning domain: `projects`
- A project has exactly one owner: the authenticated user who created it — owning domain: `projects`
- Owner is immutable in this feature; the client cannot assign or transfer ownership — owning domain: `projects`
- Client-supplied fields are required `name` and optional `description`; `name` is not unique, including per owner — owning domain: `projects`
- Only the owner may read, update, archive, unarchive, or see the project in lists — owning domain: `projects` (authorization)
- Authentication proves identity; it does not grant access to another user’s projects — owning domains: `auth` (authentication), `projects` (authorization)
- Hard delete of a project is not offered; archive sets `archivedAt`; unarchive clears `archivedAt` — owning domain: `projects`
- An archived project remains readable by the owner; PATCH is rejected until unarchive — owning domain: `projects`
- Default authorized list excludes archived projects; there is no `includeArchived` filter in this slice — owning domain: `projects`
- Archive of an already archived project, and unarchive of an active project, are idempotent — owning domain: `projects`
- Membership, roles, and shared access do not exist in this feature — owning domain: `projects` (do not create `project-members`)
- `projects` MUST NOT use another domain’s Prisma repository class; `users` MUST NOT depend on `projects`; `auth` middleware MUST NOT decide project field access — owning domains: `projects`, `users`, `auth`
- System probes remain non-product records owned by `system` — owning domain: `system`

## 8. Data

**Project** (owned by `projects`)

- Meaning: a persisted work container owned by one user.
- Identity: system-assigned unique identifier.
- Owner: `ownerUserId`, the creating user’s id. Not transferable in this feature.
- Created time: system-assigned timestamp of persistence.
- Client-supplied fields: required `name` (non-empty after trim); optional `description` (omit/null/blank stored as null). Names need not be unique, including per owner. No additional length or complexity rules.
- Archive / lifecycle: nullable `archivedAt` timestamp. Null means active. Set on archive; cleared on unarchive. Owner may GET while archived. Owner MUST NOT PATCH while archived. Hard delete is not offered.
- Uniqueness: identity is unique. `name` is not unique.
- Deletion: no user-facing hard delete.
- Listing: default owner list is active projects only (`archivedAt` is null). No archived-list filter in this slice. Recovering an archived project after leaving its detail view requires knowing its id (GET/unarchive by id); browsing archived projects is out of scope.

**User** (owned by `users`)

- Unchanged from `002-authentication`. Projects store an owner id that refers to a user. `users` does not gain project behavior.

**Session / password credential / system probe**

- Unchanged from `002-authentication`.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. The browser uses the published backend port and `VITE_API_URL`. Frontend `fetch` MUST use `credentials: 'include'`. The backend MUST allow that frontend origin via CORS with credentials enabled.

The backend MUST provide these capabilities (HTTP paths and DTO field names belong in the plan):

- Authenticated create of a project with required `name` and optional `description`; owner is the session actor.
- Authenticated list of the caller’s active owned projects (archived excluded; no `includeArchived` filter).
- Authenticated read of a project by id, with owner authorization, including archived projects.
- Authenticated update of `name` and/or `description` on an active owned project; owner and `archivedAt` are not updatable via PATCH.
- Authenticated archive of a project (`archivedAt` set), with owner authorization; no hard-delete endpoint.
- Authenticated unarchive of a project (`archivedAt` cleared), with owner authorization.
- Existing auth, users, health, ready, and probe routes remain as in `002-authentication`. `GET /health` and `GET /ready` stay public; probes stay authenticated.

Error responses MUST use `{ error: { code, message } }` plus HTTP status.

There are no third-party project integrations in this feature.

## 10. Security

- Authentication and authorization MUST remain distinct. `auth` middleware authenticates; `projects` service authorizes by comparing actor id to `ownerUserId`.
- Protected project operations MUST be enforced in the backend. Hiding UI is not authorization.
- External input MUST be validated with Zod at the HTTP boundary.
- Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard, and MUST allow credentials.
- The session cookie remains HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture is unchanged from `002-authentication` (HTTP-only cookie, `SameSite=Lax`, CORS origin allowlist with credentials, JSON bodies).
- Database credentials stay in backend/runtime env only.
- Public liveness and readiness remain intentional. Project routes MUST NOT be public. Probe routes remain authenticated as in `002-authentication`.

## 11. Non-Functional

- Create, list, read, update, archive, and unarchive MUST be usable enough to complete the flows; visual polish is not required.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- TypeScript strictness SHOULD catch boundary and domain typing issues.
- Numeric performance targets are not specified.
- No pagination product feature in this slice; list returns the caller’s authorized active projects.
- Q-016 remains deferred: list, detail, and forms MUST work with in-app view/state switching.

## 12. Dependencies

- Existing features: `001-foundation` Verified; `002-authentication` Verified. Present in the repo: `frontend/`, `backend/`, Compose services `frontend`/`backend`/`db`, domains `system`, `auth`, `users`, session cookie `devtrack_session`, CORS with credentials, error envelope, Prisma migrations `20261026120000_init_system_probe` and `20261026133000_authentication`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS for the frontend origin with credentials; Argon2id and cookie-parser already in the backend.
- New dependencies: none expected. Do not add a router, state library, or extra ORM.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session on project routes: `401`; no project data.
- Authenticated non-owner on another user’s project: `403`; no data change.
- Unknown project id: `404`.
- Invalid JSON/body, unknown fields, empty `name`, or server-owned fields in create/update: `400`; nothing persisted or changed.
- PATCH of an archived project by its owner: `409` `CONFLICT`; no field change.
- Empty authorized active list: `200` with an empty collection, not an error.
- Duplicate `name` for the same owner or another owner: allowed (`201`).
- Archive when already archived, unarchive when not archived: success, state unchanged.
- Database unreachable: `503` with envelope; no secrets leaked.
- Frontend cannot reach backend: UI error state; no database credentials involved.
- Client-supplied owner id or `archivedAt`: rejected; owner remains the session actor; archive state changes only via archive/unarchive operations.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002 | AC-001, AC-002, AC-003, AC-018 | Create API + persistence; owner = actor; duplicate names allowed |
| FR-003, FR-005 | AC-003, AC-008, AC-011 | Validation, active update, PATCH-archived rejected |
| FR-004 | AC-004, AC-005, AC-006, AC-007, AC-011 | Read 200/401/403/404, including archived GET |
| FR-006 | AC-011 | Archive sets `archivedAt`; no hard delete |
| FR-007, FR-008 | AC-006, AC-009, AC-010, AC-011 | List owner-only active; 401/403 |
| FR-009, FR-015 | AC-005, AC-016 | Session required; existing slices remain |
| FR-010, FR-012 | AC-012, AC-013 | Envelope; module layout; migration |
| FR-011 | AC-013 | `projects` module; no generic repository |
| FR-013 | AC-014 | Frontend tests + `credentials: 'include'` |
| FR-014 | AC-015 | Executed Vitest / Testing Library / SuperTest |
| FR-016 | AC-017 | Unarchive clears `archivedAt`; PATCH and list resume |

## 15. Open Questions

### Answered for this feature (no longer blocking)

- **Q-019:** Client-supplied fields are required `name` and optional `description`. Names need not be unique, including per owner. Owner: product. Status: Answered 2026-10-27.
- **Q-020:** Persist nullable `archivedAt`. Owner can GET an archived project. Owner cannot PATCH after archive. Owner can unarchive (clear `archivedAt`). Hard delete remains out of scope. Owner: product + `projects`. Status: Answered 2026-10-27.
- **Q-021:** Default list excludes archived projects. No `includeArchived` query filter in this slice. Owner: product + `projects`. Status: Answered 2026-10-27.

### Deferred (not required to implement this feature)

- **Q-016:** Frontend routing library and styling. Owner: frontend. Status: Deferred from `001-foundation`. This feature MUST NOT require introducing a router; view/state switching is enough.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Still deferred from earlier features (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.

### Later product work (do not specify here)

- Project membership roles and permissions. Owner: collaboration / `project-members`. Status: Unresolved; out of scope for `003-projects`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-019, Q-020, and Q-021 are recorded as answered
- Approved for planning: Yes
- Approved for implementation: Yes (executed T001–T017)
- Independent review: PASS WITH NON-BLOCKING FINDINGS (AC-015 independently re-run by coordinator)
- Verified: Yes; deferred Q-006, Q-007, Q-009, Q-015, Q-016, Q-017 remain open by design
