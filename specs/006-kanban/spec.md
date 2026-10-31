# Feature Specification: Kanban Board

- **ID:** 006-kanban
- **Status:** Verified
- **Created:** 2026-10-30
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified), 004-tasks (Verified), 005-frontend-shell (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Verified**. This ID is **006-kanban**, not audit. Later audit MUST NOT use feature ID `005` and MUST NOT be written as `specs/005-audit/`. Q-006, Q-007, Q-009, Q-015, and Q-017 stay deferred. Q-033, Q-034, and Q-035 are **decided** (see §15). Dashboard, collaboration, and audit remain unimplemented.

## 1. Problem

Verified `004-tasks` persist work items with `status` `TODO` | `IN_PROGRESS` | `DONE`, and verified `005-frontend-shell` hosts those tasks as an ungrouped list on the project-detail destination (`/projects/:projectId`) inside authenticated chrome (top app bar + left project sidebar). Users cannot see or move work across status columns. `prompt.md` requires a Kanban board: status columns and authorized status changes persisted through the backend, with drag-and-drop after the basic board works.

Users need that board on the existing project-detail URL, without a new destination, without a new backend domain, and without inventing assignees, comments, dashboard aggregates, membership, audit, rank/position, or Trello branding.

## 2. Goals

- Present the current project’s non-deleted tasks in three status columns (`TODO`, `IN_PROGRESS`, `DONE`) on the existing project-detail destination, replacing the ungrouped task list (Q-033).
- Persist authorized status changes through the existing backend (`PATCH` of task `status`), not only in the UI. No move endpoint. No `position`/`rank` field (Q-034).
- After the column board works, add drag-and-drop with `@dnd-kit/core` so an owner can move a card to another status column and have that status persist (Q-035). Same-column drop is a no-op.
- Keep authenticated chrome and the left project sidebar. Leave guest login/register, projects-home empty/select-or-create, and profile unchanged as product destinations.
- Keep owner-only authorization, soft-delete, optional filters, create, nested task detail, and archived-parent write conflict (`409`) from `004-tasks`.
- Keep HTTP-only `devtrack_session`, `credentials: 'include'`, and backend resource-level checks. The frontend MUST NOT be the only access check.

## 3. Non-Goals

- A new project-detail URL, a dedicated `/kanban` destination, or nested task-detail URLs.
- Changing guest login/register, authenticated root → projects, profile, or not-found destinations, or removing the left project sidebar from authenticated product destinations.
- Keeping the ungrouped 004/005 task list beside the board, or adding a list/board toggle (Q-033: replace the list).
- New task fields (assignees, comments, labels, tags, attachments, subtasks, activity history).
- A `position` / `rank` schema field, rank migration, persisted within-column order, or a move-specific HTTP endpoint (Q-034: status-only).
- Dashboard aggregates (pending, completed, overdue counts).
- Collaboration, membership, invitations, or `project-members`.
- App-wide CRUD audit logging. Later audit MUST NOT use ID `005` and MUST NOT be written as `specs/005-audit/`. This feature is not audit.
- Trello trademarks, logos, copyrighted assets, or a Trello clone. Column titles MUST come from DevTrack task statuses, not Trello list names.
- New backend domain, generic repository, or microservices.
- Changing register, login, logout, own-profile, health, readiness, probe, or project contracts.
- Hard-delete of task rows, restore/un-delete, `includeDeleted`, moving a task to another project, or an `includeArchived` sidebar filter.
- Password complexity (Q-015), rate limiting / lockout (Q-017), probe retention (Q-007), production images or CI/deployment (Q-006, Q-009).
- Changing HTTP-only `devtrack_session` cookie behavior, CORS credentials, or `fetch` `credentials: 'include'`.
- Storing a bearer token or session id in JavaScript.
- Treating hidden UI or client-only board rules as authorization.
- Required mobile sidebar collapse or a required mobile-only board layout.
- WIP limits, swimlanes, multiple boards per project.
- `@dnd-kit/sortable` or a second DnD library (Q-035: `@dnd-kit/core` only, after the column board works).

## 4. Actors and User Stories

### User Story US-001

As a project owner, I want the project-detail destination to show my tasks in `TODO`, `IN_PROGRESS`, and `DONE` columns instead of the ungrouped list, so that I can see work by status without leaving the existing URL.

### User Story US-002

As a project owner, I want changing a task’s status to persist through the backend, so that a reload or another authorized client shows the same column.

### User Story US-003

As a project owner, I want to drag a task card to another status column after the basic board works, so that I can update status from the board itself.

### User Story US-004

As a project owner of an archived project, I want to still see the board (list/GET allowed) but not persist status changes, so that archive conflict behavior from `004-tasks` is unchanged.

### User Story US-005

As an authenticated user, I want the top app bar and left project sidebar to remain on project detail, so that Kanban is a board inside the shell, not a new chrome.

### User Story US-006

As a guest, I want login and register unchanged and without a product sidebar or board, so that unauthenticated screens stay auth-only.

### User Story US-007

As a project owner, I want other authenticated users to be unable to change my task statuses, so that the board is not an access-control bypass.

### User Story US-008

As a project owner, I want create, optional status/priority filters, nested task detail/update, and soft-delete to keep working on project detail, so that the board does not drop verified task flows.

## 5. Functional Requirements

- **FR-001:** The Kanban board MUST live on the existing project-detail URL destination (`/projects/:projectId`). This feature MUST NOT add a new board route. Authenticated chrome from `005-frontend-shell` (top app bar, left project sidebar) MUST remain. Guest login/register MUST remain without a product sidebar or board. Projects-home (`/projects`) empty/select-or-create and profile MUST NOT become a Kanban board.
- **FR-002:** On project detail, the owner’s listed non-deleted tasks MUST be presented in three columns that correspond 1:1 to `TaskStatus`: `TODO`, `IN_PROGRESS`, `DONE`. The columns MUST **replace** the ungrouped 004/005 task list as the only task layout on this destination (Q-033). There MUST NOT be a list/board toggle. Create, optional filters, and nested `TaskDetail` MUST remain. Each listed task MUST appear in exactly one column matching its persisted `status`. All three columns MUST render even when a column has no cards. Column labels MUST use those DevTrack statuses (not Trello list names).
- **FR-003:** Status changes MUST persist through the backend using the existing task update capability. Use existing `PATCH /api/tasks/:id` with `{ status }` (and the existing frontend `updateTask` helper). This feature MUST NOT add a move-specific HTTP endpoint. There is still no required status sequence (`004-tasks` FR-003). Invalid status remains validation failure (`400`).
- **FR-004:** Implementation MUST be ordered: (1) column board grouping listed tasks by status, with status still changeable through the existing nested task-detail update; (2) drag-and-drop between columns after that board works. Both are in this feature, not a later feature. Drag-and-drop MUST NOT ship without a working column board. `@dnd-kit/core` MUST NOT be added until the column board works (Q-035).
- **FR-005:** Drag-and-drop of a card onto a different status column MUST call the existing authorized task update with the target column’s `status` and MUST use `credentials: 'include'`. A successful PATCH MUST result in the card appearing in the target column. Same-column drop is a no-op (Q-034): the client MUST NOT PATCH, MUST NOT send or persist `position`/`rank`, and MUST NOT invent order. Within-column visual order stays the existing project task list order (newest `createdAt` first, applied per column).
- **FR-006:** Authorization remains parent-project ownership, enforced in the backend (`tasks` via existing `projects` `ProjectAccessPort`). Unauthenticated status changes MUST fail `401`. Authenticated non-owners MUST fail `403` for live tasks. Missing or soft-deleted tasks MUST fail `404`. Hidden columns or disabled drag are not authorization. The frontend MUST NOT store a bearer token or session id in JS.
- **FR-007:** When the parent project is archived, owner GET/list (and therefore viewing the board) MUST still succeed. Status updates, including drag-and-drop persistence, MUST fail as conflict (`409` `{ error: { code: "CONFLICT", message } }`) and MUST NOT persist. The UI MUST disable or otherwise not treat a failed archived move as success; the card MUST remain in its persisted column.
- **FR-008:** Create, optional `status` and/or `priority` list filters, nested task read/update, and soft-delete MUST remain available on project detail with existing loading, empty, success, validation/error, unauthenticated, forbidden, and archived-parent conflict states. Filters still use `GET /api/projects/:projectId/tasks` query params from `004-tasks`. The board MUST display the listed (possibly filtered) tasks grouped by status. Soft-deleted tasks MUST NOT appear. Duplicate titles remain allowed. `projectId` remains immutable.
- **FR-009:** Failed persistence of a drag (network, `400`, `401`, `403`, `404`, `409`) MUST NOT leave the UI showing a durable new column. `401` keeps existing `onUnauthenticated` / login behavior. The UI MAY move a card only after a successful PATCH, or MAY move optimistically if it reverts on failure; either is allowed. A durable column change without a successful PATCH is not allowed.
- **FR-010:** No new backend domain. `tasks` owns task status and task use cases. `projects` keeps owner/archive authorization via the existing narrow port. `auth` authenticates only. `users` and `system` are unchanged as product domains. A generic repository MUST NOT be introduced. Microservices MUST NOT be introduced. Prisma types MUST NOT become public DTOs. Controllers MUST NOT query the database.
- **FR-011:** Prisma schema and migrations MUST NOT gain a `position`/`rank` (or equivalent) field. Q-034 is status-only: no rank migration, no move endpoint, no persisted within-column order.
- **FR-012:** HTTP-only session cookie `devtrack_session`, CORS origin with credentials, public `GET /health` and `GET /ready`, and authenticated probe HTTP MUST remain as verified. This feature MUST NOT change auth, users, projects, or system HTTP contracts. No `project-members`. No audit tables or `005-audit` / later-audit artifacts under this ID.
- **FR-013:** The only additional frontend dependency for this feature is `@dnd-kit/core` (Q-035), added only after the column board works. Do not add `@dnd-kit/sortable` (Q-034 is status-only). Do not add a second DnD library (`react-beautiful-dnd`, `@hello-pangea/dnd`, `react-dnd`, or others). Do not add an undeclared package, a second CSS framework, or the full shadcn catalog. Copied shadcn primitives MAY be added only if required for the board. Visual identity remains original DevTrack (Q-031 identity still applies; Q-031’s “no Kanban columns / no DnD” is **superseded on project-detail only** by this feature).
- **FR-014:** Critical board behavior MUST be tested: columns on project-detail, cards in the matching status column, empty columns visible, ungrouped list gone (no list/board toggle), status persistence via existing PATCH, archived-parent conflict, unauthenticated/forbidden, create/filter/detail/soft-delete still work, chrome/sidebar remain, guest screens unchanged, no Trello branding, `credentials: 'include'`, no token in JS storage. After DnD is added: cross-column drop persists status; same-column drop is a no-op; failed drop does not stay in the wrong column; `frontend/package.json` contains `@dnd-kit/core` and not `@dnd-kit/sortable`; 005 tests that currently forbid columns/`columnheader`/draggable on project-detail MUST be rewritten so they no longer lock the pre-Kanban list. Typecheck MUST stay strict TypeScript.
- **FR-015:** Nested task detail MAY remain in-destination state (no required `/tasks/:id` URL), as in `005-frontend-shell`. Task-detail status select remains a valid non-drag way to change status (required so DnD is not the only path).

## 6. Acceptance Criteria

### Scenario AC-001: Columns on project detail

- Given an authenticated owner on `/projects/:projectId` for a project they can open
- When the destination renders after tasks load
- Then three columns corresponding to `TODO`, `IN_PROGRESS`, and `DONE` are shown in the main area, the ungrouped 004/005 task list is not shown, there is no list/board toggle, and the left project sidebar and top app bar remain

### Scenario AC-002: Cards match persisted status

- Given that project has non-deleted tasks of mixed statuses
- When the board renders
- Then each of those tasks appears as a card in the column that matches its persisted `status`, and not in another column

### Scenario AC-003: Empty columns still render

- Given an owned project with no non-deleted `IN_PROGRESS` tasks (and possibly none at all)
- When the board renders
- Then the `IN_PROGRESS` column is still present, and if there are no listed tasks the other columns are present as well (empty), not treated as an API error

### Scenario AC-004: Status change via existing update persists

- Given an authenticated owner of an active project and a non-deleted task in `TODO`
- When they change that task’s `status` to `IN_PROGRESS` through the existing nested task-detail update (existing `PATCH`)
- Then the API persists `IN_PROGRESS` as in `004-tasks`, and after the board refreshes the card is in the `IN_PROGRESS` column

### Scenario AC-005: Cross-column drag persists status

- Given the column board works and drag-and-drop has been added with `@dnd-kit/core`, and the parent project is active
- When the owner drops a live task card onto a different status column
- Then the client sends the existing task `PATCH` with `{ status }` for the target column and `credentials: 'include'`, and on success the card is in that column on a later authorized list/GET

### Scenario AC-006: Same-column drop is a no-op

- Given status-only moves (Q-034)
- When the owner drops a card on the same status column
- Then no PATCH is sent, no `position`/`rank` field is sent or persisted, and the within-column visual order remains the existing list order (newest `createdAt` first per column)

### Scenario AC-007: Drag failure does not keep a false column

- Given a drop that the backend rejects (`409` archived, `403`, `404`, `400`) or a network failure
- When the drop attempt finishes
- Then the card is not shown as durably in the target column, and no unauthorized or conflicting write is treated as success

### Scenario AC-008: Unauthenticated cannot persist a move

- Given no valid session
- When a status update (including a board move) is attempted against the API
- Then the API responds `401` with `{ error: { code, message } }` and does not persist a status change; the product UI does not present the board as an authorized guest view

### Scenario AC-009: Non-owner cannot persist a move

- Given user B is authenticated and user A owns a live task
- When B tries to PATCH that task’s `status` (including via a forged board move)
- Then the API responds `403` `{ error: { code: "FORBIDDEN", message } }` and A’s task status is unchanged

### Scenario AC-010: Archived parent blocks status writes, allows viewing

- Given an authenticated owner of an archived project with a non-deleted task
- When they view project detail
- Then the board still shows listed non-deleted tasks in status columns
- When they try to persist a status change (detail update or drag)
- Then the API responds `409` `{ error: { code: "CONFLICT", message } }`, no status change is persisted, and the UI does not keep a successful-move state

### Scenario AC-011: Soft-deleted tasks stay off the board

- Given an owner soft-deletes a task
- When the board lists tasks
- Then that task is absent from every column (existing list excludes `deletedAt` set)

### Scenario AC-012: Filters still apply

- Given mixed tasks and optional `status` and/or `priority` filters on project detail
- When the owner applies a valid filter
- Then the board shows only listed matching tasks, grouped by their status, using the existing list query (no new filter params)

### Scenario AC-013: Create still works

- Given an active owned project
- When the owner creates a task with existing fields
- Then create still uses `POST /api/projects/:projectId/tasks` and the new task appears in the column for its persisted `status` (default `TODO` if omitted)

### Scenario AC-014: Nested detail, chrome, and guest screens

- Given this feature’s UI
- When the owner opens a card’s nested detail, uses the sidebar, visits `/projects`, `/profile`, `/login`, or `/register`
- Then nested detail/update/soft-delete still work on project detail; authenticated product destinations keep the left sidebar; guest login/register have no product sidebar and no board; `/projects` remains empty/select-or-create in the main area (not a board)

### Scenario AC-015: No Trello clone; original DevTrack identity

- Given the project-detail board
- When the UI is inspected
- Then column labels are DevTrack statuses, Trello trademarks/logos/assets are absent, and the shell still uses the 005 top bar + left sidebar + card/board surfaces

### Scenario AC-016: No new domain, generic repository, or move endpoint

- Given this feature’s implementation (Q-034 status-only)
- When APIs, Prisma schema, and modules are inspected
- Then there is no new backend domain, no generic repository, no microservice, no move-specific HTTP route, no `position`/`rank` column, and status writes reuse `PATCH /api/tasks/:id`

### Scenario AC-017: Session and credentials unchanged

- Given board fetches and status PATCH
- When they run
- Then they use `VITE_API_URL` and `credentials: 'include'`, the session remains the HTTP-only `devtrack_session` cookie, and JS storage has no bearer token or session id

### Scenario AC-018: Automated checks

- Given frontend (and backend if touched) tests and typecheck
- When the documented commands are run
- Then board/column tests pass, DnD tests pass after that phase, updated 005 tests no longer require “no columns / no draggable” on project-detail, `credentials: 'include'` is still asserted, Trello absence remains asserted, and `npm run typecheck` passes in the touched packages

### Scenario AC-019: Extra dependencies documented

- Given Q-035 (`@dnd-kit/core` only, after the column board)
- When `frontend/package.json` is inspected after DnD work
- Then `@dnd-kit/core` is present; `@dnd-kit/sortable` is absent; no second DnD library is present; no undeclared CSS framework. Before the DnD phase, no DnD package is added.

### Scenario AC-020: Existing slices remain

- Given verified `001`–`005` behavior outside the project-detail task layout
- When this feature is implemented
- Then register, login, logout, own-profile, project CRUD/archive, task field rules (title, description, priority, due date, soft-delete, owner-only), health/ready, and probe HTTP remain as verified; `SystemProbe` still has no task ownership; later audit artifacts are not created as `005-audit`

## 7. Business Rules

- A task’s board column is its persisted `status` — owning domain: `tasks`
- `status` remains `TODO` | `IN_PROGRESS` | `DONE` with no required sequence — owning domain: `tasks`
- Only the parent project owner may persist a status change — owning domain: `projects` (ownership via existing port), `tasks` (enforcing at the use-case boundary)
- Authentication is not authorization — owning domains: `auth`, `projects`, `tasks`
- Archived parent: view/list allowed; status writes conflict — owning domains: `projects`, `tasks`
- Soft-deleted tasks are not on the board — owning domain: `tasks`
- Within-column order is not a persisted invariant (Q-034): newest `createdAt` first per column (existing list order); same-column drop does not persist order — owning domain: `tasks`
- Project-detail task layout is columns only; no list/board toggle (Q-033) — owning concern: frontend
- Visual identity is original DevTrack, not a Trello clone — owning concern: frontend
- Board presentation is frontend; access control is backend — owning concern: frontend vs `tasks`/`projects`
- No assignees, comments, membership, dashboard aggregates, or audit in this feature

## 8. Data

No new business concept. The board reads existing **Task** public data (`PublicTaskDto`: `id`, `projectId`, `title`, `description`, `status`, `priority`, `dueDate`, `createdAt`). `deletedAt` remains non-public and excluded from list.

**Task** (owned by `tasks`) — unchanged from `004-tasks`:

- Status enumerations and defaults unchanged.
- Listing: non-deleted tasks for one owned project; optional `status` and/or `priority` filters; order newest `createdAt` first.
- No `position`/`rank` field (Q-034 decided: do not add).
- Authorization still uses parent project ownership, not a task owner field.

**Project** — unchanged. Archive still blocks task writes.

**User / session / probe** — unchanged.

Session material stays in the HTTP-only `devtrack_session` cookie.

## 9. API and Integrations

No new endpoints. HTTP schemas stay in the verified `004-tasks` plan.

The board continues to call:

- `GET /api/projects/:projectId/tasks` — listed cards (optional `status`/`priority` query)
- `POST /api/projects/:projectId/tasks` — create
- `GET /api/tasks/:id` — nested detail
- `PATCH /api/tasks/:id` — status (and existing title/description/priority/dueDate) updates; **this is the persistence path for column moves** (`{ status }` only for a board move)
- `DELETE /api/tasks/:id` — soft-delete
- Existing project GET/PATCH/archive/unarchive on the same destination
- Auth/session/profile unchanged

Error envelope unchanged: `{ error: { code, message } }` plus HTTP status.

There are no third-party Kanban SaaS integrations.

Do not add a move endpoint, a `position`/`rank` field, a rank migration, or a PATCH contract for rank (Q-034).

## 10. Security

- Authentication remains the HTTP-only `devtrack_session` cookie. Frontend keeps `credentials: 'include'` on every `fetch`.
- Authorization remains resource-level in the backend. Client-only column placement is not access control.
- Drag-and-drop MUST use the same authenticated PATCH as the detail form. Do not add an unauthenticated or CSRF-weaker channel.
- CSRF posture is unchanged (`SameSite=Lax`, CORS origin allowlist with credentials, JSON bodies).
- Responses and UI MUST NOT display secrets, hashes, or stack traces.
- No new secrets, env vars, or cookie flags.
- Deleted tasks MUST NOT leak existence to non-owners via `403`; they stay `404` as in `004-tasks`.

## 11. Non-Functional

- Usable desktop board: three columns in the project-detail main area; horizontal overflow MAY scroll. No invented performance budgets or required mobile collapse.
- Educational clarity: columns first, then DnD with `@dnd-kit/core`; reuse existing PATCH.
- DnD MUST NOT be the only way to change status (task-detail status control remains).
- Local Compose remains Vite/tsx dev servers (Q-006 deferred).
- Maintainable presentation: board UI lives under `frontend/src/tasks/` (or a child used by `TasksPanel` / `ProjectDetail`), not a parallel app tree and not a new backend domain folder.

## 12. Dependencies

- Existing features: Verified `001-foundation`, `002-authentication`, `003-projects`, `004-tasks`, `005-frontend-shell`.
- Architectural constraints: constitution v2.1.0 (modular monolith, no generic repository, no microservices, Prisma behind owning-domain repositories, frontend talks to backend over HTTP only, TypeScript, SDD artifacts). `prompt.md`: Kanban is status columns + authorized persisted status changes; DnD after the basic board. Additional dependencies require an explicit documented decision.
- External dependencies already decided (do not replace): React 19, Vite 7, React Router 7, Tailwind CSS 4, copied shadcn/ui primitives currently in use (`button`, `input`, `label`, `card`, `textarea`) and documented peers, Express, Prisma 6, Zod, Vitest, Testing Library, SuperTest, HTTP-only cookie session.
- **Q-035 (decided):** `@dnd-kit/core` as an explicit documented dependency, added only after the column board works. Do not add `@dnd-kit/sortable`. Do not add a second DnD library.

## 13. Failures and Edge Cases

- Session missing/invalid on PATCH: `401`; board is not an authorized guest view.
- Non-owner PATCH: `403`; no change.
- Unknown or soft-deleted task PATCH: `404`.
- Invalid status: `400`.
- Archived parent PATCH: `409`; card stays in persisted column.
- Empty authorized list: three empty columns, not an error.
- Filtered list with no matches: columns render; no matching cards (existing “No matching tasks.” MAY remain).
- Duplicate titles: allowed; cards are distinct by `id`.
- Drop on same column: no PATCH, no rank persistence (Q-034).
- Concurrent updates: last successful PATCH wins; no invented locking.
- Unknown project id on detail: existing not-found/error handling; no board of another user’s tasks.
- Path `/system/probes`: still not-found, no probe UI, no board.
- Do not `prisma migrate reset` or delete `pgdata`.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001 | AC-001, AC-014 | Frontend routing/chrome tests |
| FR-002, FR-004 (columns) | AC-001, AC-002, AC-003 | Board/column tests; ungrouped list gone |
| FR-003, FR-015 | AC-004, AC-017 | PATCH + detail update tests |
| FR-004, FR-005 (DnD) | AC-005, AC-006 | DnD tests after column board |
| FR-006, FR-012 | AC-008, AC-009, AC-017, AC-020 | API 401/403 + credentials; inspect contracts |
| FR-007 | AC-010 | Archived view + `409` |
| FR-008 | AC-011, AC-012, AC-013, AC-014 | Create/filter/detail/soft-delete tests |
| FR-009 | AC-007 | Failed-drop tests |
| FR-010, FR-011 | AC-016 | Inspect modules/Prisma |
| FR-013 | AC-015, AC-019 | Identity tests; package.json vs Q-035 (`@dnd-kit/core` only) |
| FR-014 | AC-018 | Executed typecheck + tests |

## 15. Open Questions

### Resolved for this feature (decided)

- **Q-033:** Keep vs replace the ungrouped 004/005 task list on project-detail. Owner: product + frontend. Status: **Decided**. Replace the ungrouped task list on `/projects/:projectId` with the Kanban board. No list/board toggle. Keep create, optional filters, and nested `TaskDetail`.
- **Q-034:** Within-column order and whether a persisted `position`/`rank` field is required. Owner: product + `tasks`. Status: **Decided**. Status-only. Drag between columns PATCHes existing task `status`. No `position`/`rank` field, no rank migration, no move endpoint. Same-column drop is a no-op (order not persisted). Within-column visual order stays existing list order (newest `createdAt` first per column).
- **Q-035:** Drag-and-drop library (additional dependency). Owner: frontend. Status: **Decided**. `@dnd-kit/core` as an explicit documented dependency, added only after the column board works. Do not add `@dnd-kit/sortable` (Q-034 is status-only). Do not add a second DnD library.

### Resolved earlier (still in force except as this feature supersedes Q-031 columns/DnD on project-detail)

- Q-016 / Q-028 / Q-029 / Q-030 / Q-032: frontend shell routing, Tailwind + copied shadcn, no probe UI, left sidebar — remain.
- Q-031: original DevTrack identity, not a Trello clone, no trademarks — remain. The “no Kanban columns / no drag-and-drop” part is **superseded on project-detail only** by `006-kanban`.
- Q-022–Q-026: soft-delete, filters, archived parent, defaults, immutable `projectId` — remain.
- Q-027: audit is later work, **not** ID `005` and **not** this feature.

### Deferred (out of scope)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Later product work (do not specify here)

- Dashboard aggregates.
- Project membership / `project-members`.
- App-wide CRUD audit logging (later feature ID, **not** `005`, **not** `006`; do not write `specs/005-audit/`).
- Assignees and comments.
- Nested task-detail URLs (optional; not required here).
- Responsive/mobile sidebar collapse (unspecified; not required here).

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-033, Q-034, and Q-035 are decided
- Approved for planning: Yes
- Approved for implementation: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Non-blocking: dedicated drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path. Coordinator independently re-ran (Node 22.13.0): `frontend` `npm run typecheck` exit 0; `frontend` `npm test` 12 files / 107 tests passed. Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): login → project detail shows TODO/IN_PROGRESS/DONE columns; create task appears in TODO; keyboard DnD Space+ArrowRight+Space moved card to IN_PROGRESS; sidebar/chrome kept.
- Verified: Yes; Q-033–Q-035 decided; deferred Q-006, Q-007, Q-009, Q-015, Q-017 remain; dashboard, collaboration, and audit remain unimplemented; later audit MUST NOT use ID `005`; `specs/005-audit/` was not created; no rank migration; `@dnd-kit/core` only (no `@dnd-kit/sortable`)
