# Feature Specification: Task Comments

- **ID:** 010-task-comments
- **Status:** Verified
- **Created:** 2026-11-04
- **Related features:** 001-foundation (Verified) through 009-collaboration (Verified). Proposed backlog item **D** (`proposed-features.md`).

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. Q-058, Q-059, Q-060, and Q-061 are **Decided** and recorded in section 15. Decided constraints already recorded: comments-only scope; create/list authz follows task read/write via `TaskAuthorizationPort`; edit is author-only; soft-delete is author OR project OWNER (effective OWNER: role or `ownerUserId` grant); deferred card activity (**L**) and labels (**E**) with the decisions below. Do not invent assignees, attachments, checklists, voting, notifications, or audit tables. Do not change `constitution.md`.

This ID is **010-task-comments** (proposed product ID **D**). Do not write `specs/005-audit/`. Do not specify card activity or labels beyond the deferred next-work records in this folder.

## 1. Problem

Verified slices persist projects, membership roles (`OWNER` / `EDITOR` / `VIEWER`), and project-scoped tasks with Kanban and task-detail Dialogs. Collaborators can change task fields, but there is no persisted discussion on a task. Teams still cannot leave comments that other authorized members can read through the backend, or correct and remove discussion under clear ownership rules.

`proposed-features.md` lists comments as item **D**, suggested after collaboration. Card activity (**L**) and labels (**E**) are related board depth, but this feature is **comments only**.

## 2. Goals

- Let an authenticated actor who may **write** tasks on a project create a comment on a non-deleted task of that project.
- Let an authenticated actor who may **read** tasks list those comments through the backend, not only in the UI.
- Let the **author** of a live comment edit that comment’s `body` via `PATCH` (author-only; non-authors MUST NOT edit).
- Let the **author** or a project **OWNER** soft-delete a live comment via `deletedAt` (no restore API; soft-deleted comments hidden from list and item ops as not found).
- Persist each comment with system-assigned identity, task association, author (session actor), plain-text body, created time, and nullable `deletedAt`.
- Authorize comment create/list using the **same** project-membership task read/write rules already verified in `009-collaboration` via `TaskAuthorizationPort`. Edit is author-only. Soft-delete is author OR effective project OWNER. Do not invent a separate comment role matrix.
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to comments on tasks the actor cannot read (for list) or write (for create), and MUST NOT allow edit/delete beyond the rules above.
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an additive migration only.
- Surface comments in the existing task-detail Dialog without redesigning workspace UI, Kanban, dashboard, or membership admin.
- Record deferred next work for card activity (**L**) and labels (**E**) with the product decisions already chosen; do not implement them here.

## 3. Non-Goals

- Card activity / task event history (`proposed-features.md` **L**) — deferred next work only; decisions recorded in section 15.
- Labels / tags (`proposed-features.md` **E**) — deferred next work only; decisions recorded in section 15.
- Assignees, attachments, checklists, subtasks, voting, reactions, or notifications.
- Mentions (`@user`) parsing, mention storage, or mention notifications (Q-060 Decided: out of scope).
- Markdown / HTML / rich-text rendering or a rich-text editor dependency (Q-061 Decided: plain text only).
- Hard-delete of comment rows; restore of soft-deleted comments; `updatedAt` / edit history fields.
- Non-author edit (including OWNER/EDITOR editing another user’s comment) — forbidden (Q-058).
- EDITOR soft-delete of another user’s comment — forbidden unless the actor is the author (Q-059).
- App-wide CRUD audit tables or an audit domain. Do not write `specs/005-audit/`.
- Changing task field enumerations, soft-delete semantics, `projectId` immutability, membership roles, Members Dialog, Kanban DnD, dashboard ownership scope, or workspace-ui chrome redesign.
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).
- Hard-delete of tasks or projects; restore of soft-deleted tasks; `includeArchived` on project list.

## 4. Actors and User Stories

### User Story US-001

As an OWNER or EDITOR on a project, I want to add a comment on a non-deleted task, so that discussion is persisted with that task.

### User Story US-002

As an OWNER, EDITOR, or VIEWER authorized to read tasks on a project, I want to list comments on a non-deleted task, so that I can follow the discussion.

### User Story US-003

As an authenticated user who is not authorized on the parent project, I want comment create/list to stay forbidden, so that a valid session is not a global grant.

### User Story US-004

As a VIEWER, I want to read comments but not create them, so that comment create follows the same rule as task write.

### User Story US-005

As the author of a comment, I want to edit my own comment’s body and soft-delete my own comment, so that I can correct or remove what I wrote.

### User Story US-006

As a project OWNER, I want to soft-delete any live comment on a task in my project (including comments I did not author), so that I can moderate discussion without editing other people’s words.

### User Story US-007

As a developer, I want comments owned inside the `tasks` bounded context with Prisma only behind that domain’s repository and create/list authz via the existing `project-members` task authorization port, so that domain boundaries stay acyclic.

### User Story US-008

As a developer, I want existing auth, membership, Kanban, and workspace destinations to keep working, so that comments do not replace verified slices or implement activity/labels here.

## 5. Functional Requirements

- **FR-001:** An authenticated actor who is authorized for **task write** on the parent project (OWNER or EDITOR, including `ownerUserId` OWNER grant) MUST be able to create a comment on a non-deleted task of that project. Unauthenticated callers MUST NOT create comments. VIEWER and non-members MUST NOT create comments (`403` when the parent project exists and the actor lacks task-write). Create against an archived parent MUST follow the same archived rules as task writes: authorized `ownerUserId` → `409` `CONFLICT`; non-owner members on archived → `403`.
- **FR-002:** A created comment MUST have a system-assigned unique identity, a system-assigned created time, a `taskId`, an `authorUserId` equal to the session actor (client MUST NOT supply author), a required plain-text `body`, and `deletedAt` null. This feature MUST NOT invent assignee, attachment, label, mention, reaction, notification, rich-text, or audit fields on the comment. There are no additional complexity rules beyond `body` required and non-empty after trim (Q-061: plain text only).
- **FR-003:** Create MUST reject missing or empty `body` (after trim) and MUST reject unknown or server-owned fields (including `id`, `createdAt`, `authorUserId`, `deletedAt`, `taskId` in the body) with validation failure (`400`). Association is the path `:taskId`.
- **FR-004:** An authenticated actor who is authorized for **task read** on the parent project (OWNER, EDITOR, or VIEWER, including `ownerUserId` grant) MUST be able to list **non-deleted** comments for a non-deleted task. Unauthenticated callers MUST fail as unauthenticated. Non-members MUST fail as forbidden when the parent project exists. A request against a task id that does not exist or whose `deletedAt` is set MUST fail as not found for every caller. Empty authorized list MUST be `200` with an empty collection. Soft-deleted comments MUST NOT appear in the list.
- **FR-005:** Comment list order MUST be oldest `createdAt` first among live comments (conversation / thread order). Soft-deleted parent tasks have no comment API surface (`404`). Comments left on a later soft-deleted task remain in storage but MUST NOT be listed or mutated via HTTP while the task is deleted.
- **FR-006:** Authentication MUST remain distinct from authorization. Protected comment operations MUST require a valid `devtrack_session`. Missing, malformed, expired, revoked, or unknown cookies MUST fail as `401`. `auth` middleware MUST NOT decide membership or comment permissions. Frontend-only hiding MUST NOT replace backend checks.
- **FR-007:** Comment **create** authorization MUST reuse existing task-write rules via `TaskAuthorizationPort.requireTaskWrite`. Comment **list** authorization MUST reuse existing task-read rules via `TaskAuthorizationPort.requireTaskRead`. Comment **edit** MUST be author-only (`authorUserId` equals the session actor); non-authors MUST receive `403` even if they are OWNER or EDITOR. Comment **soft-delete** MUST be allowed when the actor is the author **or** an effective project OWNER (OWNER membership role or `ownerUserId` grant); EDITOR/VIEWER who are not the author MUST receive `403`. This feature MUST NOT invent a separate comment role matrix beyond those rules. OWNER checks for soft-delete MUST use a narrow `project-members` port (extend `TaskAuthorizationPort` or an additive sibling port) so `tasks` does not import another domain’s Prisma repository.
- **FR-008:** The backend MUST remain a modular monolith. **`tasks`** MUST own comment persistence, comment invariants, and comment use cases (same bounded context as tasks; no new product domain folder inventing `comments` as a sixth peer capability in `prompt.md`). `project-members` keeps owning membership policy and authorization ports. `users` keeps identity for author display. `auth` owns sessions. `projects` owns projects. `system` unchanged. A generic repository MUST NOT be introduced. Circular domain dependencies MUST NOT be introduced. `tasks` MUST NOT import other domains’ Prisma repository implementations.
- **FR-009:** Prisma MUST be used only behind owning-domain repositories. Comment persistence MUST be an **additive** versioned migration under `backend/prisma/`. Do not `migrate reset` or delete volumes. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries. Prisma types MUST NOT be domain entities or public DTOs.
- **FR-010:** External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, session ids in JSON, or sensitive database data. Existing public project/task DTO **field sets** MUST NOT gain comment arrays or label fields in this feature. Public comment DTOs MUST NOT include `deletedAt`.
- **FR-011:** The React UI MUST show comments inside the existing task-detail Dialog: list for readers; create form for actors with task write (`canWrite`); edit control only on comments the current user authored; soft-delete control for the author or when the actor has OWNER chrome. Cover loading, empty, success, validation, unauthenticated, forbidden, not-found, and archived-parent conflict states as applicable. Call `VITE_API_URL` with `credentials: 'include'`. Do not store a bearer token in JS. Do not redesign board chrome, Members Dialog, dashboard, or Kanban. Render `body` as plain text (no Markdown/HTML rendering).
- **FR-012:** Domain comment identity, author binding, non-empty body, task association, soft-delete via `deletedAt`, author-only edit, author-or-OWNER soft-delete, and authz-vs-auth MUST be testable without HTTP or Prisma. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-013:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public.
- **FR-014:** This feature MUST NOT implement card activity (**L**), labels (**E**), mentions, or rich text. It MUST NOT write `specs/005-audit/`.
- **FR-015:** Public comment responses MUST include author attribution suitable for the Dialog: at least `authorUserId` and `authorDisplayName` resolved via `UsersIdentityPort` (not a client-supplied name). Do not nest a full user object. Do not include password or credential data.
- **FR-016:** An authenticated **author** MUST be able to `PATCH` a **live** comment’s `body` on a non-deleted task. Only `body` is mutable. `id`, `taskId`, `authorUserId`, `createdAt`, and `deletedAt` MUST NOT change via PATCH. Missing or empty `body` after trim, unknown fields, and server-owned fields MUST fail validation (`400`). Non-authors MUST receive `403`. Unknown comment id, soft-deleted comment, comment not belonging to `:taskId`, or soft-deleted/missing task MUST be `404` for every caller. Mutating a comment when the parent project is archived MUST follow the same archived conflict/forbid behavior as task writes once the actor is otherwise allowed to edit: `ownerUserId` → `409`; non-`ownerUserId` members → `403`.
- **FR-017:** Soft-delete MUST be HTTP `DELETE` that sets `deletedAt` and MUST NOT remove the row. There is **no restore** API. Soft-deleted comments MUST be excluded from list and MUST yield `404` on subsequent PATCH/DELETE (and any item get). Who may soft-delete: author **or** effective project OWNER. Already soft-deleted → `404`. Archived parent mutation rules match FR-016 / task writes.

### Permission mapping

Create/list reuse the 009 task matrix via `TaskAuthorizationPort`. Edit and soft-delete use the Decided author/OWNER rules (not a new role name).

| Operation | OWNER | EDITOR | VIEWER |
| --- | --- | --- | --- |
| List live comments on a live task | yes | yes | yes |
| Create comment on a live task | yes | yes | no (`403`) |
| Edit own live comment (`PATCH`) | yes if author | yes if author | yes if author |
| Edit another user’s comment | no (`403`) | no (`403`) | no (`403`) |
| Soft-delete own live comment | yes | yes if author | yes if author |
| Soft-delete another user’s comment | yes (OWNER) | no (`403`) | no (`403`) |
| Non-member on existing project (create/list) | `403` | `403` | `403` |
| Soft-deleted or missing task (any comment op) | `404` | `404` | `404` |
| Soft-deleted or missing comment (item op) | `404` | `404` | `404` |
| Write/mutate on archived parent when `ownerUserId` | `409` | n/a (non-owner members `403` on archived) | `403` on archived |

Effective OWNER includes `ownerUserId` grant even without a membership row (same as 009).

## 6. Acceptance Criteria

### Scenario AC-001: Successful create

- Given an authenticated OWNER or EDITOR of an active project with a non-deleted task
- When they create a comment with a non-empty plain-text `body` (after trim)
- Then a comment is persisted with system-assigned `id` and `createdAt`, `deletedAt` null, `taskId` equal to that task, `authorUserId` equal to the actor, the API responds `201` with the public comment DTO (including `authorDisplayName`, omitting `deletedAt`) and no secrets, and a later authorized list includes that comment

### Scenario AC-002: Unauthenticated create, list, edit, or soft-delete

- Given a caller with no valid session cookie
- When they try to create, list, PATCH, or DELETE comments
- Then the API responds `401` with `{ error: { code: "UNAUTHENTICATED", message } }` and does not return comment data or persist changes

### Scenario AC-003: Create validation

- Given an authenticated task-write actor
- When they create a comment with missing or empty `body` (after trim), unknown fields, or server-owned fields such as `id`, `createdAt`, `authorUserId`, `deletedAt`, or body `taskId`
- Then the API responds `400` with `{ error: { code: "VALIDATION_ERROR", message } }` and no comment is persisted

### Scenario AC-004: Authorized list

- Given authenticated members (including a VIEWER) of an active project with live comments on a non-deleted task
- When they list comments for that task
- Then the API responds `200` with `{ comments: PublicCommentDto[] }` in oldest-`createdAt`-first order among live comments, including author attribution, MUST NOT include comments from other tasks, and MUST NOT include soft-deleted comments
- When a live task has no live comments
- Then the API responds `200` with `{ comments: [] }`

### Scenario AC-005: VIEWER cannot create

- Given an authenticated VIEWER of an active project with a non-deleted task
- When they try to create a comment
- Then the API responds `403` and no comment is persisted
- When they list comments
- Then the API responds `200` (read allowed)

### Scenario AC-006: Non-member forbidden; missing/deleted task or comment not found

- Given project P exists and authenticated user B is not authorized on P
- When B tries to create or list comments on a live task of P
- Then the API responds `403`
- Given any authenticated user
- When they create or list against a task id that does not exist or is soft-deleted
- Then the API responds `404`
- Given any authenticated user
- When they PATCH or DELETE a comment id that does not exist, is soft-deleted, or does not belong to `:taskId`
- Then the API responds `404`

### Scenario AC-007: Archived parent write conflict vs member forbid

- Given an archived project and the `ownerUserId` user
- When they try to create, edit, or soft-delete a comment on a non-deleted task of that project (when otherwise allowed)
- Then the API responds `409` `CONFLICT` and does not persist
- Given a non-owner member of an archived project
- When they try to create, list, edit, or soft-delete comments on that project’s tasks
- Then the API responds `403`

### Scenario AC-008: Architecture and domain boundary

- Given comment create, list, edit, or soft-delete is exercised
- When the request is handled
- Then control flows Express route → `tasks` controller → `tasks` service → `tasks` comment repository → Prisma for comment persistence; create/list authorization uses `TaskAuthorizationPort`; soft-delete OWNER check uses a narrow `project-members` port; author display uses `UsersIdentityPort`; Prisma types are not public DTOs; no circular domain dependency; no generic repository

### Scenario AC-009: Existing slices remain

- Given verified auth, membership, Kanban, workspace-ui, and dashboard
- When this feature is implemented
- Then register/login/logout, membership, task field rules, status-only DnD, destinations, Members Dialog, and dashboard owner-scoping still behave as verified
- Then this folder does not implement card activity or labels; no `specs/005-audit/`; no assignees/attachments/checklists/notifications; no mention parsing; no Markdown/HTML rendering requirement

### Scenario AC-010: Frontend task-detail comments

- Given the running frontend and an authorized member
- When they open task detail
- Then readers see the live comments list as plain text; writers see a create control; authors see edit on their own comments; authors and OWNER chrome see soft-delete where allowed; calls use `credentials: 'include'`; no bearer token in JS; VIEWER has no create control that bypasses backend; no workspace redesign; no restore UI

### Scenario AC-011: Sensitive data stays off the wire

- Given any comment success or failure response
- When the body is inspected
- Then failures use the error envelope, and never include password hashes, secrets, stack traces, session ids in JSON, database connection data, or `deletedAt`

### Scenario AC-012: Automated checks

- Given the new comment domain behavior, API, and UI tests
- When the documented commands are run
- Then author binding, non-empty body, soft-delete, author-only edit, author-or-OWNER delete, and authz-vs-auth tests pass without HTTP or Prisma where applicable, and Vitest / Testing Library / SuperTest checks for this feature pass without breaking existing auth, membership, task, health/ready, and probe cases

### Scenario AC-013: Draft gate

- Given these artifacts are Draft
- When implementation is requested
- Then work MUST stop at the approval gate until status is explicitly Approved

### Scenario AC-014: Author edits own comment

- Given an authenticated author of a live comment on a non-deleted task in an active project
- When they `PATCH` with a non-empty `body` (after trim)
- Then the API responds `200` with the updated public comment DTO; `authorUserId`, `taskId`, `id`, and `createdAt` are unchanged; a later list shows the new body

### Scenario AC-015: Non-author cannot edit

- Given an authenticated OWNER or EDITOR who is not the author of a live comment
- When they try to `PATCH` that comment
- Then the API responds `403` and the body is unchanged

### Scenario AC-016: Soft-delete by author or OWNER

- Given a live comment on a non-deleted task in an active project
- When the author soft-deletes it via `DELETE`
- Then the API responds `204` with an empty body; the row remains with `deletedAt` set; later list omits it; later PATCH/DELETE return `404`; there is no restore route
- When an effective project OWNER who is not the author soft-deletes another user’s live comment
- Then the same soft-delete outcomes apply
- When an EDITOR who is not the author tries to soft-delete that comment
- Then the API responds `403` and the comment remains live

## 7. Business Rules

- A comment belongs to exactly one task; association is immutable after create — owning domain: `tasks`
- Author is the authenticated actor at create time; client cannot set `authorUserId` — owning domain: `tasks`
- `body` is required and non-empty after trim; plain text only (Q-061); no mention parsing (Q-060) — owning domain: `tasks`
- Comment list is oldest-first by `createdAt` among live comments (`deletedAt` null) — owning domain: `tasks`
- Soft-deleted tasks are not found for comment operations — owning domain: `tasks`
- Soft-deleted comments are hidden from list and not found on item ops; no restore — owning domain: `tasks`
- Only the author may edit `body` — owning domain: `tasks`
- Soft-delete allowed for author or effective project OWNER — owning domains: `tasks` + `project-members`
- Comment create requires task-write; comment list requires task-read — owning domains: `project-members` (policy port) + `tasks` (enforcement at use case)
- Archived parent: same conflict/forbid behavior as task writes/reads for members on mutating and list ops — owning domain: `tasks` + `project-members`
- Authentication proves identity; it does not grant comment access — owning domains: `auth` + `project-members` + `tasks`
- Card activity and labels are not rules of this feature — deferred next work only

## 8. Data

**Task comment** (owned by `tasks`)

- Meaning: a persisted discussion message on a task.
- Identity: system-assigned unique identifier.
- Associations: existing task id; existing user id as author.
- Body: required plain-text string (non-empty after trim); no Markdown/HTML requirement; no mention parsing.
- Uniqueness: no uniqueness on body; many comments per task allowed.
- Lifecycle: created via authorized create; author may PATCH `body`; author or OWNER may soft-delete via `deletedAt`; no restore; no hard-delete API.
- Deletion of parent task: task soft-delete does not require hard-deleting comment rows; comment HTTP on deleted tasks is `404`. FK policy MUST NOT cascade-delete `User` or `Task` from comment soft-delete.
- Persistence fields: `id`, `taskId`, `authorUserId`, `body`, `createdAt`, nullable `deletedAt`.
- Client-visible attribution: comment `id`, `taskId`, `authorUserId`, `authorDisplayName`, `body`, `createdAt` (omit `deletedAt`).

**Task** (owned by `tasks`)

- Unchanged field set from `004-tasks` / `009-collaboration`. No embedded comments array on the public task DTO in this feature.

**User** (owned by `users`)

- Unchanged. Author `displayName` resolved via identity port.

**Project membership / session / probe**

- Unchanged role set. Soft-delete OWNER check reuses effective OWNER resolution from 009.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. `credentials: 'include'`. CORS origin with credentials, not `*`.

The backend MUST provide:

- Create comment on a task (session + task-write).
- List live comments for a task (session + task-read).
- Edit own comment body (session + author-only): `PATCH`.
- Soft-delete comment (session + author or OWNER): `DELETE` sets `deletedAt`, `204`, no restore.
- Existing auth, users, projects, members, tasks, dashboard, health, ready, and probe routes unchanged in path and existing DTO field sets.

HTTP schemas (DTOs, status details) belong in `plan.md`.

Error responses MUST use `{ error: { code, message } }` plus HTTP status. Reuse `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`. Do not invent extra error codes.

There are no mail, mention notification, or third-party integrations in this feature.

## 10. Security

- Authentication and authorization MUST remain distinct.
- Protected comment operations MUST be enforced in the backend.
- Authorization MUST be resource-level (this task’s parent project and/or comment authorship), not “any authenticated user.”
- External input MUST be validated with Zod at the HTTP boundary.
- Responses MUST NOT include secrets, stack traces, password hashes, `deletedAt`, or sensitive database data.
- CORS MUST allow only the configured frontend origin with credentials, not `*`.
- The session cookie remains HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture is unchanged (`SameSite=Lax`, origin allowlist, JSON bodies).
- Database credentials stay in backend/runtime env only.
- Author identity MUST come from the session, never from a client-supplied author field.
- Body is plain text; do not introduce HTML rendering that would require sanitization rules in this feature.

## 11. Non-Functional

- Comments UI in task detail MUST be usable enough to create, read, edit own, and soft-delete allowed comments; visual polish beyond existing Dialog patterns is out of scope.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- TypeScript strictness SHOULD catch boundary and domain typing issues.
- Numeric performance targets are not specified.
- No pagination product feature in this slice (full live list for a task).
- No new npm dependencies (plain text; no rich-text editor).

## 12. Dependencies

- Existing features: `001-foundation` through `009-collaboration` Verified. Present: Compose `frontend`/`backend`/`db`; domains `system`, `auth`, `users`, `projects`, `tasks`, `project-members`; `TaskAuthorizationPort`; `UsersIdentityPort`; task-detail Dialog; cookie `devtrack_session`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete; no circular domain dependencies.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS with credentials; Argon2id; React Router 7; Tailwind + copied shadcn; `@dnd-kit/core`.
- New dependencies: none.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session: `401`; no data.
- Authenticated but not authorized for task read/write on an existing live project (create/list): `403`.
- Non-author edit: `403`.
- Non-author non-OWNER soft-delete: `403`.
- Unknown or soft-deleted task: `404` for every caller.
- Unknown, soft-deleted, or wrong-task comment on item ops: `404` for every caller.
- Invalid JSON/body, unknown fields, invalid ids: `400` `VALIDATION_ERROR`.
- Empty `body` after trim on create/PATCH: `400`.
- Create/edit/soft-delete on archived parent when otherwise allowed as `ownerUserId`: `409`.
- Non-owner member on archived project: `403` for comment create/list/edit/soft-delete.
- Empty live comment list: `200` `{ comments: [] }`.
- Database unreachable: `503` with envelope; no secrets leaked.
- Implementation while Draft: not allowed; stop and return to planning.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-002, FR-003 | AC-001, AC-003 | Create; validation |
| FR-004, FR-005 | AC-004 | List; order; empty; hide soft-deleted |
| FR-006, FR-007 | AC-002, AC-005, AC-006, AC-007, AC-015, AC-016 | Authz matrix + author/OWNER rules |
| FR-008, FR-009 | AC-008 | `tasks` ownership; additive migration |
| FR-010, FR-015 | AC-011 | Envelope; author attribution; omit `deletedAt` |
| FR-011 | AC-010 | TaskDetail UI |
| FR-012, FR-013 | AC-012 | Executed tests |
| FR-014 | AC-009, AC-013 | No L/E; Draft gate |
| FR-016 | AC-014, AC-015 | Author PATCH; non-author 403 |
| FR-017 | AC-016 | Soft-delete; no restore |

## 15. Open Questions

### Decided for this feature

- **Q-058:** Comment edit after create. Owner: product + `tasks`. Status: **Decided**. Author may `PATCH` own comment `body` only. Non-authors (including OWNER/EDITOR) MUST NOT edit. Path: `PATCH /api/tasks/:taskId/comments/:commentId`.
- **Q-059:** Comment delete. Owner: product + `tasks`. Status: **Decided**. Soft-delete via nullable `deletedAt`. HTTP `DELETE` sets `deletedAt` and does not remove the row. Who may soft-delete: **author** or effective project **OWNER** (role or `ownerUserId` grant). Soft-deleted comments are hidden from list and treated as not found (`404`) on item ops. **No restore API**.
- **Q-060:** Mentions. Owner: product. Status: **Decided**. Out of scope for this feature — plain body only; no `@mention` parsing, storage, or notifications.
- **Q-061:** Body format. Owner: product + frontend. Status: **Decided**. Plain text only. No Markdown/HTML rich-text rendering requirement. No rich-text editor dependency.
- **Q-062:** Feature scope batch. Owner: product. Status: **Decided**. This folder is **comments only** (proposed ID **D**). Do not implement card activity or labels here.
- **Q-063:** Authorization mapping. Owner: product + `project-members` + `tasks`. Status: **Decided**. Comment create follows task write; comment list follows task read (009 matrix via `TaskAuthorizationPort`). Edit is author-only. Soft-delete is author OR effective project OWNER.
- **Q-064:** List order. Owner: product + `tasks`. Status: **Decided**. Oldest `createdAt` first among live comments (conversation order).
- **Q-065:** Domain ownership. Owner: architecture. Status: **Decided**. Comments are owned by the existing `tasks` domain (persistence + use cases), not a new peer domain and not `project-members`.

### Deferred next work (do not implement in `010-task-comments`)

- **Card activity (proposed ID L):** Later feature. Scope decision recorded now: **task events only** — task created, task field changes, task soft-delete, and comments added. Do not invent a full app-wide audit table in that later feature unless separately specified. Overlap with app-wide audit (**C**) must be resolved when that later feature is specified. Do not specify endpoints or schema in this folder beyond this record.
- **Labels / tags (proposed ID E):** Later feature. Scope decisions recorded now: **per-project label catalog**; **many labels per task**; show labels on the card face; support filter by label. Do not specify endpoints or schema in this folder beyond this record.

### Deferred platform items (unchanged)

- **Q-006:** Dev vs production images. Deferred.
- **Q-007:** Probe list retention. Deferred.
- **Q-009:** CI and deployment. Deferred.
- **Q-015:** Password complexity beyond non-empty. Deferred.
- **Q-017:** Rate limiting and account lockout. Deferred.

### Later product work (do not specify here)

- Assignees, attachments, checklists, voting, notifications, invite-by-email (**M**), public share links (**O**), AI, app-wide audit (later ID, **not** `005` / not `specs/005-audit/`).

### Remaining open (non-blocking)

None that block recording these Draft artifacts. Optional later product choices (not invented here): maximum `body` length; whether demoted former authors retain edit/delete solely by authorship (Decided rules already allow author regardless of current role); whether `authorDisplayName` should ever be snapshotted at create time (current plan: resolve at response time).

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-058–Q-061 Decided; Q-062–Q-065 remain Decided
- Approved for planning: Yes
- Approved for implementation: Yes
