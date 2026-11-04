# Feature Specification: Task Activity

- **ID:** 011-task-activity
- **Status:** Draft
- **Created:** 2026-11-04
- **Related features:** 001-foundation through 010-task-comments (Verified); proposed backlog **L**; proposed audit **C** deferred separately (not this folder)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Draft**. Material product questions Q-066–Q-079 are **Decided** (recorded in section 15). Do not invent further business rules beyond those answers. Decided constraints: **task events only** (task created, task field changes, task soft-delete, comments added); not a full app-wide audit table; do not implement labels (**E**); do not write `specs/005-audit/`; do not change `constitution.md`; reuse Verified `TaskAuthorizationPort` / membership roles; additive Prisma migration only; keep Verified `010-task-comments` HTTP contracts intact (comment-added emission is internal only); status remains Draft until explicit approval.

This ID is **011-task-activity** (proposed product ID **L**). Do not write `specs/005-audit/`. Do not specify labels (**E**) beyond a non-goal. Do not specify app-wide audit (**C**) beyond the Decided overlap resolution (Q-066).

## 1. Problem

Verified slices persist membership-authorized projects and tasks, Kanban status changes, and task comments. Collaborators can change task fields and add comments, but the task-detail surface has **no persisted activity history** that shows who created the task, which fields changed, when the task was soft-deleted, or when comments were added.

`proposed-features.md` lists this as item **L** (“Activity on the card”), deferred from `010-task-comments` with the product decision: **task events only** — task created, task field changes, task soft-delete, and comments added — not a full changelog and not app-wide audit (**C**).

## 2. Goals

- Persist a **task-scoped** activity history for the four Decided event kinds so authorized readers can see what happened on a task through the backend.
- Emit activity as a **system side effect** of successful Verified task create / field update / soft-delete and comment create use cases — clients MUST NOT invent or forge events.
- Keep authentication distinct from authorization: a valid session MUST NOT grant access to activity on tasks the actor cannot read; list requires `TaskAuthorizationPort.requireTaskRead` (Q-068).
- Reuse session cookie `devtrack_session`, Zod, error envelope, npm / Node.js 22 / PostgreSQL 16 / Prisma 6, Vitest + Testing Library + SuperTest, modular monolith, Prisma behind owning-domain repositories, and an **additive** migration only.
- Surface activity as a read-only section in the existing task-detail Dialog (Q-069) without redesigning workspace UI, Kanban, dashboard, membership admin, or comments contracts; no new route; no board-card activity strip.
- Resolve overlap with proposed audit (**C**) as a separate later feature (Q-066); this feature neither implements nor unifies into C.

## 3. Non-Goals

- App-wide CRUD audit (`proposed-features.md` **C**) — separate later feature ID; do not write `specs/005-audit/`; do not invent C’s schema or endpoints here (Q-066).
- Labels / tags (`proposed-features.md` **E**) — out of scope; do not implement.
- Comment edit (`PATCH` body) or comment soft-delete as activity event kinds — Decided scope is **comments added** only.
- Project create/update/archive, membership add/role/remove, auth/session, dashboard, or system probe events.
- Assignees, attachments, checklists, subtasks, voting, reactions, notifications, mentions, rich text, calendar, search, AI.
- Client-writable activity APIs (create/update/delete of events by the client).
- Hard-delete of task rows; restore of soft-deleted tasks or comments; changing Verified task or comment public DTO field sets (none required for comment-added emission).
- Backfill / synthetic history for existing tasks — forward-only from feature deploy (Q-074).
- Pagination for activity list in this feature (Q-078).
- Microservices, a generic repository, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).

## 4. Actors and User Stories

### User Story US-001

As an authenticated project member who can read a task, I want to see a persisted activity history for that task, so that I understand create, field changes, soft-delete, and comment-added events without relying on memory.

### User Story US-002

As an OWNER or EDITOR who creates, updates, or soft-deletes a task, I want those successful writes to record activity automatically, so that readers see an accurate trail without a separate “log” action.

### User Story US-003

As an OWNER or EDITOR who adds a comment, I want a comment-added activity event to be recorded automatically, so that activity reflects discussion start without changing the public comments API contract.

### User Story US-004

As a VIEWER (or other actor with task read), I want to list activity but not forge events, so that hiding UI is not treated as authorization and history stays system-authored.

### User Story US-005

As a developer, I want activity owned inside the existing `tasks` domain with narrow ports and no circular domain imports, so that Verified `tasks` / `project-members` / comments invariants stay intact.

### User Story US-006

As a developer, I want Verified comments HTTP contracts, task field rules, Kanban persistence, membership, and workspace destinations to keep working, so that activity does not replace those slices or implement labels/audit.

## 5. Functional Requirements

- **FR-001:** The system MUST persist **task-scoped** activity events for exactly these kinds when the corresponding successful write completes: **task created**, **task field changes**, **task soft-delete**, and **comments added**. Unauthenticated callers MUST NOT list activity. Clients MUST NOT create, update, or delete activity rows via a public write API.
- **FR-002:** A persisted activity event MUST have a system-assigned unique identity, a system-assigned created time, a `taskId` association, an actor identity equal to the authenticated writer of the triggering use case (client MUST NOT supply actor), and a kind from the Decided set. Field-change payload MUST include field names plus old and new values for changed fields only (Q-071). Comment-added payload MUST include `commentId` and a short body preview (Q-075).
- **FR-003:** Successful `TasksService.create` MUST emit a **task created** event for that task and actor. Successful `TasksService.update` that changes one or more of the mutable task fields (`title`, `description`, `status`, `priority`, `dueDate`) MUST emit **one** task field-change activity event covering all changed fields together (Q-070). Successful `TasksService.softDelete` MUST emit a **task soft-delete** event. Successful `CommentsService.create` MUST emit a **comments added** event. Comment `PATCH` / comment soft-delete MUST NOT emit activity in this feature. A no-op PATCH (no actual field value change) MUST NOT emit field-change activity (Q-072).
- **FR-004:** An authenticated actor who is authorized for **task read** on the parent project via `TaskAuthorizationPort.requireTaskRead` (OWNER, EDITOR, or VIEWER, including `ownerUserId` grant) MUST be able to list activity for a non-deleted task (Q-068). Unauthenticated callers MUST fail as unauthenticated. Non-members MUST fail as forbidden when the parent project exists. A request against a task id that does not exist or whose `deletedAt` is set MUST fail as not found for every caller (same pattern as comments list). Empty authorized list MUST be `200` with an empty collection.
- **FR-005:** Activity list order MUST be newest `createdAt` first (Q-073). Soft-deleted parent tasks have no activity list API surface (`404`). Events recorded before a later soft-delete remain in storage but MUST NOT be listed via HTTP while the task is soft-deleted (same pattern as comments).
- **FR-006:** Public activity responses MUST include `actorUserId` and `actorDisplayName` resolved at **list time** via `UsersIdentityPort` (Q-076). Do not nest a full user object. Do not include password or credential data. Do not expose Prisma metadata.
- **FR-007:** Authorization MUST reuse Verified `TaskAuthorizationPort` / membership roles. Authentication MUST remain distinct from authorization. Protected list MUST be enforced in the backend.
- **FR-008:** Verified `010-task-comments` public HTTP contracts (paths, request/response DTOs, status codes for comment create/list/PATCH/soft-delete) MUST remain intact. Emitting comment-added activity is an **internal** side effect inside the owning domain’s comment create use case. No public comments contract extension is required.
- **FR-009:** Persistence MUST use an additive versioned Prisma migration under `backend/prisma/`. MUST NOT use `migrate reset` or delete Docker volumes. MUST NOT introduce an app-wide audit table claiming to cover all domains.
- **FR-010:** The React UI MUST show a read-only activity section inside the existing task-detail Dialog (Q-069): list for authorized readers; loading/empty/success/error/401/403/404 states as applicable. No new route/page; no board-card face activity strip. Call `VITE_API_URL` with `credentials: 'include'`. Do not store a bearer token in JS. Do not redesign board chrome, Members Dialog, dashboard, Kanban, or comments UI beyond adding the activity section. Do not implement labels UI.
- **FR-011:** Domain activity identity, task association, actor binding, Decided event kinds, newest-first list ordering, and authz-vs-auth MUST be testable without HTTP or Prisma. API and critical UI behavior MUST be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-012:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public.
- **FR-013:** This feature MUST NOT implement labels (**E**) or app-wide audit (**C**). It MUST NOT write `specs/005-audit/`. It MUST NOT change `constitution.md`.
- **FR-014:** Emitting writes MUST persist the triggering write and the activity event in the **same DB transaction**; if the event insert fails, the write MUST fail (Q-077).
- **FR-015:** Existing Verified task create/update/soft-delete and comment create HTTP behaviors (status codes, authz matrix, archived parent rules) MUST remain as verified; activity emission MUST NOT weaken those checks.
- **FR-016:** Activity history is **forward-only** from feature deploy; MUST NOT backfill synthetic events for existing tasks (Q-074).
- **FR-017:** Activity list MUST return the **full** list for a task with **no pagination** in this feature (Q-078).
- **FR-018:** Public list path MUST be `GET /api/tasks/:taskId/activity` returning `{ activity: [...] }` (Q-079).

## 6. Acceptance Criteria

### Scenario AC-001: Task created emits activity

- Given an authorized writer creates a live task on a non-archived project
- When create succeeds
- Then a task-created activity event is persisted for that `taskId` with actor = session user
- Then an authorized reader (task read) can list that event via `GET /api/tasks/:taskId/activity`

### Scenario AC-002: Task field changes emit activity

- Given an authorized writer PATCHes one or more mutable fields on a live task
- When update succeeds and at least one field value actually changes
- Then exactly one task field-change activity event is persisted covering all changed fields together, with field names and old/new values for changed fields only
- Then an unauthorized non-member cannot list it (`403` when project exists)

### Scenario AC-003: Task soft-delete emits activity and hides list

- Given an authorized writer soft-deletes a live task
- When soft-delete succeeds
- Then a task soft-delete activity event is persisted
- Then subsequent activity list for that task id returns `404` for every caller (soft-deleted task)

### Scenario AC-004: Comment added emits activity without changing comments contract

- Given an authorized writer creates a comment via existing `POST /api/tasks/:taskId/comments`
- When create succeeds with the Verified response shape
- Then a comments-added activity event is persisted for that task with `commentId` and a short body preview
- Then comment `PATCH` and comment soft-delete do not create activity events

### Scenario AC-005: List authz and empty list

- Given a live task with no activity yet (forward-only deploy; no backfill)
- When an authorized reader lists activity via `requireTaskRead`
- Then `200` with `{ activity: [] }`
- When unauthenticated
- Then `401`
- When authenticated non-member and project exists
- Then `403`

### Scenario AC-006: Missing or soft-deleted task

- Given a missing or soft-deleted task id
- When any caller lists activity
- Then `404` for every caller

### Scenario AC-007: No client write API

- Given the activity feature
- When a client attempts to forge activity (no public POST/PATCH/DELETE activity routes in this feature)
- Then there is no supported client write contract for activity rows

### Scenario AC-008: Actor attribution and no secrets

- Given listed activity events
- When the API responds
- Then each event includes `actorUserId` and `actorDisplayName` resolved at list time
- Then responses never include passwords, hashes, session ids, or stack traces

### Scenario AC-009: Scope boundaries hold

- Given verified auth, membership, Kanban, workspace-ui, dashboard, and comments
- When this feature is implemented
- Then those slices still behave as verified
- Then this folder does not implement labels or app-wide audit; no `specs/005-audit/`; no client-forged events; comment edit/delete are not activity kinds

### Scenario AC-010: Frontend task-detail activity

- Given TaskDetail Dialog for an authorized reader
- When activity loads
- Then the UI shows a read-only activity section (newest first, or empty state) with credentials include; no new route; no board-card strip
- Then there is no labels UI and no Trello branding requirement

### Scenario AC-011: Additive migration only

- Given Prisma schema changes for task activity
- When migration is applied
- Then it is versioned and additive under `backend/prisma/`
- Then no `migrate reset` and no volume delete are required or performed for this feature

### Scenario AC-012: Draft gate

- Given these artifacts remain Draft
- When implementation is requested
- Then work stops until explicit approval

### Scenario AC-013: Domain and port boundaries

- Given activity use cases
- When authorization is checked
- Then `TaskAuthorizationPort.requireTaskRead` is used for list; activity is owned in `tasks`; no Prisma cross-domain repository imports; no generic repository

### Scenario AC-014: No-op PATCH does not emit

- Given an authorized writer PATCHes a live task with no actual field value change
- When update succeeds as a no-op
- Then no field-change activity event is persisted

### Scenario AC-015: Emission atomicity

- Given a triggering write that would emit activity
- When the activity insert fails inside the same DB transaction
- Then the triggering write fails (no write without its event)

### Scenario AC-016: List order and bounds

- Given multiple activity events on a live task
- When an authorized reader lists activity
- Then events are newest `createdAt` first
- Then the full list is returned with no pagination

## 7. Business Rules

- Activity events are task-scoped; association `taskId` is immutable after create — owning domain: **`tasks`** (Q-067)
- Actor is the authenticated writer of the triggering use case; client cannot set actor — owning domain: `tasks`
- Only Decided kinds: task created, task field changes, task soft-delete, comments added — owning domain: `tasks`
- One field-change event per successful PATCH with actual changes; include old/new for changed fields only; no emit on no-op (Q-070, Q-071, Q-072)
- Comment-added payload includes `commentId` + short body preview (Q-075)
- Comment edit and comment soft-delete do not produce activity in this feature — owning domain: `tasks`
- Clients cannot forge events — owning domain: `tasks`
- Soft-deleted / missing task → not found for activity list — owning domain: `tasks`
- List authz = `requireTaskRead`; order newest first; full list; forward-only; list-time actor display name; same-transaction emission (Q-068, Q-073–Q-078)
- Authentication proves identity; it does not grant activity access — owning domains: `auth` + `project-members` + `tasks`
- Labels and app-wide audit are not rules of this feature — deferred / out of scope (Q-066)

## 8. Data

Business concepts (not Prisma prescription):

- **Task activity event:** identity, task association, actor user id, kind (one of the four Decided kinds), created time, and kind-specific payload: field-change = changed field names with old/new values; comment-added = `commentId` + short body preview; created/soft-delete may use empty or minimal payload as planned.
- Lifecycle: created by system on successful writes in the same transaction as the write; no client update/delete API; forward-only (no backfill); events retained in storage when the parent task is soft-deleted (hidden via `404` list), matching comments pattern for subordinate rows.
- Uniqueness: no uniqueness required across payloads; many events per task.
- Ownership: subordinate to a task; domain ownership = existing **`tasks`** domain (Q-067).

## 9. API and Integrations

- Authenticated list: `GET /api/tasks/:taskId/activity` → `{ activity: [...] }` (Q-079). Full list, newest first, no pagination.
- **No** public create/update/delete activity endpoints in this feature.
- Triggering writes remain existing task and comment endpoints; activity is a side effect.
- No mail or third-party integrations.

## 10. Security

- Authentication and authorization MUST remain distinct.
- Protected activity list MUST be enforced in the backend via `TaskAuthorizationPort.requireTaskRead`.
- Actor identity MUST come from the session of the triggering write, never from a client-supplied actor field on a write API (there is no client write API).
- Secrets, stack traces, password hashes, and sensitive database data MUST NOT appear in API responses.
- Soft-deleted task ids MUST NOT leak activity via list (`404` for every caller).

## 11. Non-Functional

- Activity UI in task detail MUST be usable enough to load and read the list; visual polish beyond existing Dialog patterns is out of scope.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, and Vitest + Testing Library + SuperTest stack MUST be reused.
- Full list for a task; no pagination product feature in this slice (Q-078).
- No new npm dependencies (none expected).

## 12. Dependencies

- Existing features: `001-foundation` through `010-task-comments` Verified. Present: Compose `frontend`/`backend`/`db`; domains `system`, `auth`, `users`, `projects`, `tasks`, `project-members`; `TaskAuthorizationPort`; `UsersIdentityPort`; task-detail Dialog with comments; cookie `devtrack_session`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; additive versioned migration; no unauthorized database reset or volume delete; no circular domain dependencies.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS with credentials; Argon2id; React Router 7; Tailwind + copied shadcn; `@dnd-kit/core`.
- New dependencies: none expected.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session on list: `401`; no data.
- Authenticated but not authorized for task read on an existing live project: `403`.
- Missing or soft-deleted task: `404` for every caller on list.
- Archived parent project: list MUST follow the same read rules as task/comment list via `TaskAuthorizationPort`; do not invent a new archived matrix.
- No-op field PATCH: do not emit field-change activity (Q-072).
- Emission failure: fail the triggering write when activity insert fails in the same transaction (Q-077).
- Database unreachable: `503` with envelope; no secrets leaked.
- Implementation while Draft: not allowed; stop until explicit approval.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001–AC-004, AC-007 | Domain/service + SuperTest |
| FR-002 | AC-001, AC-002, AC-004, AC-008 | Domain + API asserts |
| FR-003 | AC-001–AC-004, AC-014 | Service tests on create/update/softDelete/comment create |
| FR-004 | AC-005, AC-006 | SuperTest authz |
| FR-005 | AC-003, AC-016 | SuperTest + ordering tests |
| FR-006 | AC-008 | SuperTest body asserts |
| FR-007 | AC-005, AC-013 | Port usage + SuperTest |
| FR-008 | AC-004, AC-009 | Comments contract regression |
| FR-009 | AC-011 | Migration review |
| FR-010 | AC-010 | Frontend tests |
| FR-011 | AC-001–AC-008, AC-013–AC-016 | Unit/API/UI tests |
| FR-012 | AC-009 | Smoke / existing health |
| FR-013 | AC-009 | Spec compliance review |
| FR-014 | AC-015 | Service / persistence tests |
| FR-015 | AC-009 | Regression SuperTest |
| FR-016 | AC-005 | No backfill asserts / review |
| FR-017 | AC-016 | SuperTest full list |
| FR-018 | AC-005, AC-016 | SuperTest path/DTO |

## 15. Open Questions

### Decided for this feature (from backlog / 010 deferred notes / brief)

- **Scope kinds:** task created; task field changes; task soft-delete; comments added only.
- **Not** a full app-wide audit table in this feature.
- **Not** labels (**E**); **not** `specs/005-audit/`; **not** constitution changes.
- **Authz reuse:** Verified `TaskAuthorizationPort` / membership roles.
- **Migrations:** additive only; no migrate reset; no volume delete.
- **Comments contracts:** keep intact; comment-added emission is internal only.
- **Status:** Draft until user approval.

### Decided — Q-066–Q-079 (user numbered options)

- **Q-066 (overlap with C):** Owner: product + architecture. Status: **Decided**. Option **1**. This feature is **task activity only** (product UX for the four Decided task event kinds). It is **not** proposed item **C** (app-wide CRUD audit). Do not write `specs/005-audit/`. Later **C** remains a separate proposed feature with a **later** feature ID. This folder does **not** define C’s schema, endpoints, retention, or coverage.
- **Q-067:** Domain ownership. Owner: architecture. Status: **Decided**. Option **1**. Own activity under the existing **`tasks`** domain (same pattern as comments). No new peer `activity` product domain.
- **Q-068:** Who may list activity. Owner: product + `project-members` + `tasks`. Status: **Decided**. Option **1**. Anyone with task read may list — `TaskAuthorizationPort.requireTaskRead`.
- **Q-069:** UI surface. Owner: product + frontend. Status: **Decided**. Option **1**. Read-only activity section inside existing `TaskDetail` Dialog; no new route/page; no board-card face activity strip.
- **Q-070:** Field-change granularity. Owner: product + `tasks`. Status: **Decided**. Option **1**. One event per successful PATCH covering all changed fields together.
- **Q-071:** Field-change payload. Owner: product + `tasks`. Status: **Decided**. Option **1**. Field names plus old and new values for changed fields only (`title`, `description`, `status`, `priority`, `dueDate` as applicable).
- **Q-072:** No-op PATCH. Owner: product + `tasks`. Status: **Decided**. Option **1**. Do not emit field-change activity when no field value actually changes.
- **Q-073:** List order. Owner: product + `tasks`. Status: **Decided**. Option **1**. Newest `createdAt` first.
- **Q-074:** Backfill. Owner: product. Status: **Decided**. Option **1**. Forward-only from feature deploy; no synthetic history for existing tasks.
- **Q-075:** Comment-added payload. Owner: product + `tasks`. Status: **Decided**. Option **2**. Store/return `commentId` **and** a short body preview (not commentId-only).
- **Q-076:** Actor display name. Owner: product + `users`. Status: **Decided**. Option **1**. Resolve `actorDisplayName` at list time via `UsersIdentityPort`.
- **Q-077:** Emission atomicity / failure. Owner: architecture + `tasks`. Status: **Decided**. Option **1**. Same DB transaction as the triggering write; fail the write if event insert fails.
- **Q-078:** List bounds / pagination. Owner: product. Status: **Decided**. Option **1**. Full list for a task; no pagination in this feature.
- **Q-079:** Public list path / DTO. Owner: API. Status: **Decided**. Option **1**. `GET /api/tasks/:taskId/activity` returns `{ activity: [...] }`.

### Deferred platform items (unchanged)

- **Q-006:** Dev vs production images. Deferred.
- **Q-007:** Probe list retention. Deferred.
- **Q-009:** CI and deployment. Deferred.
- **Q-015:** Password complexity beyond non-empty. Deferred.
- **Q-017:** Rate limiting and account lockout. Deferred.

### Later product work (do not specify here)

- Labels (**E**), app-wide audit (**C**, later ID, not `specs/005-audit/`), assignees, attachments, checklists, notifications, invite-by-email (**M**), public share links (**O**), AI, comment edit/delete activity kinds.

## 16. Approval

- Requirements reviewed: No (Draft)
- Material ambiguities resolved: Yes — Q-066–Q-079 Decided
- Approved for planning: No (plan is Draft alongside this spec; awaiting user Approve)
- Approved for implementation: No
