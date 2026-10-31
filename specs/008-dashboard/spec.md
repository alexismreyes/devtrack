# Feature Specification: Dashboard

- **ID:** 008-dashboard
- **Status:** Verified
- **Created:** 2026-10-31
- **Related features:** 001-foundation (Verified), 002-authentication (Verified), 003-projects (Verified), 004-tasks (Verified), 005-frontend-shell (Verified), 006-kanban (Verified), 007-workspace-ui (Verified)

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

These artifacts are **Approved**. Implement only this approved scope. Do not expand into collaboration, members, audit, email, or AI.

Q-045, Q-046, Q-047, Q-048, Q-049, and Q-050 are **Decided** and recorded in §15. Implementation MUST follow those answers. Do not invent extras (charts, due-soon lists, activity feeds, `includeArchived` on `GET /api/projects`, replacing the `/projects` card grid, or changing guest root / authenticated root).

This ID is **008-dashboard**. Do not write `specs/005-audit/`. Do not reuse feature IDs `005`, `006`, or `007`. Do not specify collaboration, membership, or `project-members` in this folder.

## 1. Problem

Verified slices already persist owner-only projects and project-scoped tasks (`TODO` / `IN_PROGRESS` / `DONE`, optional calendar `dueDate`, soft-delete via `deletedAt`) and present them in an authenticated React Router shell (`/projects` card grid, `/projects/:projectId` Kanban, `/profile`).

`prompt.md` still requires a dashboard: project and task summaries plus pending, completed, and overdue counts from persisted data. Users cannot yet see those owner-scoped summaries and counts. Overdue presentation was explicitly out of scope for `004-tasks`. Workspace UI polish is presentation of existing project/task screens, not aggregates.

## 2. Goals

- Let an authenticated project owner open `/dashboard` in the existing authenticated shell and see owner-wide plus per-project project/task summaries and pending, completed, and overdue counts derived from persisted data they are authorized to see.
- Keep counts consistent with persisted project and task rows (not with ephemeral UI-only state).
- Exclude soft-deleted tasks from every dashboard count and summary.
- Exclude archived owned projects and their tasks from every dashboard count and summary.
- Keep authorization owner-only: a valid session MUST NOT expose another user’s projects or tasks.
- Fit the dashboard into the existing authenticated shell (`AuthenticatedLayout`, React Router, existing product destinations). Do not redesign workspace UI. Do not replace the `/projects` card grid.
- Reuse existing domains (`auth`, `users`, `projects`, `tasks`, `system`). Do not create a `dashboard` bounded context or `project-members`.
- Keep verified auth, projects, tasks, Kanban, and workspace-ui behavior.

## 3. Non-Goals

- Collaboration, membership, invitations, shared access, roles, or `project-members`.
- App-wide CRUD audit logging. Do not write `specs/005-audit/`. Later audit MUST NOT use IDs `005`, `006`, or `007`.
- Email, notifications, SMTP, or AI.
- Comments, labels, tags, assignees, attachments, checklists, search, calendar view, activity feeds, due-soon lists, or charts.
- A `position` / `rank` field, restore of soft-deleted tasks, hard-delete of tasks or projects, or an `includeArchived` list filter on `GET /api/projects`.
- New persisted project/task fields, cover images, or a User palette/theme field.
- Redesigning workspace UI (card grid, compact sidebar, Dialogs, palettes, remaining-height Kanban columns, DragOverlay).
- Replacing the `/projects` card grid with the dashboard. Changing authenticated `/` → `/projects`. Changing guest `/` → register.
- Changing cookie session behavior, CORS, `credentials: 'include'`, health/ready, or existing project/task HTTP contracts except the additive derived-read `GET /api/dashboard`.
- Composing the dashboard from per-project `GET /api/projects/:projectId/tasks` (Q-048 chose one backend derived-read).
- Microservices, a generic repository, a `dashboard` domain module, or Prisma access outside owning-domain repositories.
- Production images, CI, or deployment (Q-006, Q-009); probe retention (Q-007); password complexity (Q-015); rate limiting / lockout (Q-017).

## 4. Actors and User Stories

### User Story US-001

As an authenticated owner, I want a `/dashboard` destination of my project and task summaries, so that I can see progress without opening every board.

### User Story US-002

As an authenticated owner, I want pending, completed, and overdue counts from persisted data, so that the numbers match what is stored, not only what is on one Kanban board.

### User Story US-003

As an authenticated owner, I want soft-deleted tasks omitted from those counts and summaries, so that deleted work does not look like live progress.

### User Story US-004

As an authenticated owner, I want other authenticated users to be unable to see my dashboard data, so that authentication is not treated as authorization.

### User Story US-005

As a developer, I want existing auth, profile, project, Kanban, and workspace-ui flows to keep working, so that the dashboard does not replace the verified product shell.

### User Story US-006

As an authenticated owner, I want archived projects and their tasks omitted from dashboard summaries and counts, so that only active owned work is summarized.

## 5. Functional Requirements

- **FR-001:** An authenticated owner MUST be able to see project summaries and task summaries for data they are authorized to see (ownership, same rule as `003-projects` / `004-tasks`). Unauthenticated callers MUST NOT receive dashboard summaries or counts. An authenticated non-owner MUST NOT receive another user’s project or task summaries or counts.
- **FR-002:** The dashboard MUST present owner-wide totals and a per-project breakdown of: project count (owner-wide only), task count, pending count, completed count, and overdue count, derived from persisted tasks and their parent projects, not from client-only mock data. It MUST NOT add extra lists (recent tasks, due-soon), charts, or activity feeds (Q-050).
- **FR-003:** Soft-deleted tasks (`deletedAt` is set) MUST NOT be included in pending, completed, overdue, or task counts, and MUST NOT appear in task summaries. There is no restore API in this feature.
- **FR-004:** A task is overdue if and only if all of the following hold: `dueDate` is not null; `status` is not `DONE`; the `dueDate` calendar date is strictly before UTC today (`YYYY-MM-DD` from the stored UTC date vs UTC today’s calendar date). Due today is on time (not overdue). `DONE` is never overdue. Null `dueDate` is never overdue (Q-046).
- **FR-005:** Dashboard data MUST be scoped to the authenticated actor’s **active** owned projects (`archivedAt` is null). Archived owned projects and all of their tasks MUST be excluded from every dashboard summary and count. Membership MUST NOT be used. This feature MUST NOT add `includeArchived` on `GET /api/projects` (Q-047).
- **FR-006:** Authentication MUST remain distinct from authorization. Protected dashboard access MUST require a valid `devtrack_session`. Missing, malformed, expired, revoked, or unknown cookies MUST fail as unauthenticated. Frontend route guards MUST NOT replace backend checks. `GET /api/dashboard` MUST enforce owner scope in the backend.
- **FR-007:** Existing destinations MUST remain: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → `/projects`; unknown paths → not-found. Guest login/register MUST keep having no product sidebar. This feature MUST add authenticated destination `/dashboard` inside `AuthenticatedLayout`, with a nav link to `/dashboard` in that layout’s top app bar. It MUST NOT replace the `/projects` card grid. It MUST NOT change the DevTrack brand link away from `/projects`. This feature MUST NOT redesign workspace UI.
- **FR-008:** Aggregations MUST live in a `tasks` application/use-case over existing `projects` and `tasks` repository contracts (and existing narrow ports), not in a new `dashboard` domain module, not in controllers, and not as ad hoc Prisma in services. `projects` MUST NOT import the `tasks` Prisma repository. `tasks` MUST NOT import the `projects` Prisma repository. Circular domain dependencies MUST NOT be introduced. `project-members` MUST NOT be created. `system` MUST NOT own dashboard data.
- **FR-009:** This feature MUST NOT add Prisma models or fields for dashboard storage. Counts and summaries are derived from existing `Project` and `Task` persistence. A versioned migration is allowed only if a real persistence gap is found; none is expected. Controllers MUST NOT query the database. Prisma types MUST NOT be public DTOs.
- **FR-010:** HTTP contracts for existing auth, users, projects, tasks, health, ready, and probes MUST remain as verified. This feature MUST add one additive derived-read: `GET /api/dashboard`, session-cookie authenticated, owner-scoped. The response MUST include owner-wide `projectCount`, `taskCount`, `pendingCount`, `completedCount`, and `overdueCount`, plus a per-project breakdown of the same task/pending/completed/overdue counts with project identity (`id`, `name`). It MUST NOT return task lists, due-soon lists, or chart series. External input MUST be validated at HTTP boundaries with Zod. Failures MUST use HTTP status plus `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- **FR-011:** The React UI MUST show loading, empty (zero authorized active projects/tasks → zero counts and an empty per-project list, not an error), success, unauthenticated, and error states for `/dashboard`. The browser MUST keep using the published backend port, `VITE_API_URL`, and `fetch` `credentials: 'include'`. The frontend MUST NOT store a bearer token in JS. Copied shadcn primitives already in the app MAY be reused. No second CSS framework, no `next-themes`, no DropdownMenu, no new DnD library.
- **FR-012:** Domain-relevant aggregation rules in this spec (owner scope, exclude archived projects and their tasks, exclude soft-deleted tasks, overdue definition, pending/completed mapping) MUST be testable without HTTP or Prisma once a use-case exists. API and critical dashboard UI behavior MUST also be tested with Vitest, Testing Library, and SuperTest as applicable.
- **FR-013:** CORS, session cookie, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and the error envelope MUST stay as verified. `GET /health` and `GET /ready` MUST remain public. Probe HTTP remains authenticated and unused as product chrome.
- **FR-014:** This feature MUST NOT add comments, labels, email, AI, members, roles, or audit events.
- **FR-015:** Pending MUST count tasks whose status is `TODO` or `IN_PROGRESS`. Completed MUST count tasks whose status is `DONE`. A pending task MAY also count as overdue (overlap allowed). A completed (`DONE`) task MUST NEVER count as overdue. Pending and completed are disjoint. Owner-wide `pendingCount + completedCount` MUST equal owner-wide `taskCount` for the authorized active set (Q-049).

## 6. Acceptance Criteria

### Scenario AC-001: Owner sees required dashboard content

- Given an authenticated owner with persisted active owned project and task data
- When they open `/dashboard`
- Then the UI is inside `AuthenticatedLayout` (top app bar, left project sidebar, main outlet) and presents owner-wide project count, task count, pending, completed, and overdue counts plus a per-project breakdown of task/pending/completed/overdue counts with project identity
- Then those numbers are derived from persisted active owned data using FR-003, FR-004, FR-005, and FR-015
- Then the top app bar includes a nav link to `/dashboard`
- Then workspace-ui card grid, Kanban, Dialogs, and palettes are not redesigned, and `/projects` still shows the card grid

### Scenario AC-002: Unauthenticated access

- Given a caller with no valid session cookie
- When they request `GET /api/dashboard`
- Then the API responds `401` with `{ error: { code, message } }` and does not return another user’s or the missing user’s project/task summaries or counts
- When a guest opens `/dashboard`
- Then they are sent to login and dashboard data is not shown as authorized

### Scenario AC-003: Non-owner isolation

- Given user A owns projects and tasks and user B is authenticated
- When B views `/dashboard` or calls `GET /api/dashboard`
- Then B’s summaries and counts include only B’s authorized active data and MUST NOT include A’s projects or tasks

### Scenario AC-004: Soft-deleted tasks are excluded

- Given an authenticated owner of a non-deleted task on an active owned project that would otherwise contribute to a pending, completed, overdue, or task count
- When that task is soft-deleted
- Then a later `GET /api/dashboard` and dashboard UI omit it from those counts, while the database row remains

### Scenario AC-005: Null due date is not overdue

- Given an authenticated owner of a non-deleted, non-`DONE` task on an active owned project with `dueDate` null
- When dashboard overdue is computed
- Then that task is not included in the overdue count

### Scenario AC-006: Empty authorized data

- Given an authenticated owner with no active owned projects and no authorized non-deleted tasks on active owned projects
- When they view `/dashboard` or call `GET /api/dashboard`
- Then `projectCount`, `taskCount`, `pendingCount`, `completedCount`, and `overdueCount` are `0`, `projects` is empty, and the API/UI treat this as success (`200`), not `404` or an error

### Scenario AC-007: Counts follow persistence

- Given an authenticated owner viewing the dashboard
- When they create, update status or due date, or soft-delete a task through existing verified APIs, or archive/unarchive a project
- Then a subsequent `GET /api/dashboard` reflects the persisted state, including dropping an archived project and its tasks from all counts and the per-project breakdown, and restoring them after unarchive

### Scenario AC-008: Existing slices remain

- Given the verified shell
- When this feature is implemented
- Then `/projects` card grid, `/projects/:projectId` Kanban with existing Dialogs and status-only drag-and-drop, `/profile`, guest login/register, cookie auth, owner-only project/task APIs, archived parent `409` on task writes, and palette localStorage behavior still work as in `007-workspace-ui`
- Then authenticated `/` still redirects to `/projects` and guest `/` still redirects to register
- Then no `project-members` module, no audit tables, no email/AI, and no `specs/005-audit/` exist because of this feature

### Scenario AC-009: Architecture and persistence

- Given dashboard summaries and counts are produced
- When `GET /api/dashboard` is handled
- Then aggregations run in a `tasks` application/use-case over existing `projects` and `tasks` repositories/ports, not a new `dashboard` domain with its own Prisma model, not controller Prisma, and not one domain importing another domain’s Prisma repository
- Then Prisma schema has no new dashboard fields or models unless a documented persistence gap required a migration (expected: none)
- Then the derived-read is additive, session-authenticated, owner-scoped, uses the existing error envelope, and does not change existing project/task route DTO shapes

### Scenario AC-010: Frontend integration

- Given the running frontend and an authenticated owner
- When they use `/dashboard`
- Then fetches use `VITE_API_URL` `GET /api/dashboard` with `credentials: 'include'`, no bearer/session id is stored in JS, loading/empty/success/error/unauthenticated states exist, and the dashboard fits the existing authenticated shell without a second CSS framework, `next-themes`, DropdownMenu, or a new DnD library

### Scenario AC-011: Sensitive data stays off the wire

- Given any dashboard success or failure response
- When the body is inspected
- Then failures use the error envelope, and never include password hashes, secrets, stack traces, session ids in JSON, or database connection data
- Then success bodies do not include `deletedAt`, password material, or other users’ data

### Scenario AC-012: Automated checks

- Given the new use-case, `GET /api/dashboard` API tests, and UI tests
- When the documented commands are run
- Then owner isolation, soft-delete exclusion, archived exclusion, overdue rules, pending/completed mapping, and null-due-date-not-overdue tests pass at the appropriate boundary, and Vitest / Testing Library / SuperTest checks for this feature pass, including existing auth, profile, project, task, health/ready, and probe cases that remain in suite

### Scenario AC-013: Recorded decisions are followed; extras are not invented

- Given Q-045–Q-050 are Decided in this spec
- When the feature is implemented after approval
- Then the destination is `/dashboard` with an `AuthenticatedLayout` nav link; overdue is UTC calendar-date strictly before today; `DONE` and null `dueDate` are never overdue; archived owned projects and their tasks are excluded; loading is `GET /api/dashboard`; pending is `TODO` + `IN_PROGRESS`; completed is `DONE`; overdue may overlap pending; summaries are owner-wide totals plus per-project breakdown only
- Then charts, due-soon lists, activity feeds, replacing `/projects`, changing guest or authenticated root, `includeArchived` on `GET /api/projects`, and a `dashboard` backend module MUST NOT appear

### Scenario AC-014: Overdue calendar rule

- Given an authenticated owner of non-deleted tasks on an active owned project
- When `dueDate` is UTC today and status is `TODO` or `IN_PROGRESS`
- Then the task counts as pending and MUST NOT count as overdue
- When `dueDate` is a calendar date strictly before UTC today and status is `TODO` or `IN_PROGRESS`
- Then the task counts as pending and overdue
- When status is `DONE` and `dueDate` is strictly before UTC today
- Then the task counts as completed and MUST NOT count as overdue

### Scenario AC-015: Archived projects excluded

- Given an authenticated owner of an archived project that has non-deleted tasks, including tasks that would be pending, completed, or overdue if the project were active
- When they call `GET /api/dashboard`
- Then that project is absent from `projects`, and none of its tasks contribute to owner-wide counts
- Then `GET /api/projects` still has no `includeArchived` query

### Scenario AC-016: Pending, completed, and overlap

- Given an authenticated owner of non-deleted tasks on active owned projects in `TODO`, `IN_PROGRESS`, and `DONE`
- When dashboard counts are computed
- Then pending is the number of `TODO` + `IN_PROGRESS` tasks, completed is the number of `DONE` tasks, and `pendingCount + completedCount` equals `taskCount`
- Then a `TODO` or `IN_PROGRESS` task with a past UTC due date is included in both pending and overdue
- Then no `DONE` task is included in overdue

### Scenario AC-017: Routing stays additive

- Given an authenticated owner
- When they visit `/`
- Then they are redirected to `/projects`, not `/dashboard`
- When they visit `/projects`
- Then the card grid remains (dashboard does not replace it)
- Given a guest
- When they visit `/`
- Then they are redirected to register, not `/dashboard`

## 7. Business Rules

- Dashboard content is a derived read of existing Project and Task data — owning domains: `projects`, `tasks` (no `dashboard` domain)
- Only the authenticated owner’s **active** projects and those projects’ non-deleted tasks are in scope — owning domain: `projects` (ownership, archive); `tasks` (task rows); `auth` (authentication)
- Soft-deleted tasks MUST NOT count — owning domain: `tasks`
- Archived owned projects and their tasks MUST NOT count — owning domain: `projects` + `tasks`
- A task with null due date is not overdue — owning domain: `tasks`
- Overdue means `dueDate` calendar date strictly before UTC today; due today is on time; `DONE` is never overdue — owning domain: `tasks` (Q-046)
- Pending = `TODO` + `IN_PROGRESS`; completed = `DONE`; pending and overdue may overlap; completed and overdue MUST NOT overlap — owning domain: `tasks` (Q-049)
- Authentication is not authorization — owning domains: `auth`, `projects`, `tasks`
- Membership, roles, audit, email, and AI do not exist in this feature
- `projects` MUST NOT use the `tasks` Prisma repository; `tasks` MUST NOT use the `projects` Prisma repository; avoid a `projects` → `tasks` module dependency (keep existing `tasks` → `projects` port direction)
- System probes remain non-product records owned by `system`

## 8. Data

No new persisted business entity. The dashboard is not stored.

**Project** (owned by `projects`)

- Unchanged from `003-projects`: identity, `ownerUserId`, `name`, optional `description`, `createdAt`, nullable `archivedAt`.
- Default owner list still excludes archived projects. Dashboard aggregates also exclude archived owned projects. This feature MUST NOT add an `includeArchived` list filter on `GET /api/projects`.

**Task** (owned by `tasks`)

- Unchanged from `004-tasks`: identity, `projectId`, `title`, optional `description`, `status` (`TODO` | `IN_PROGRESS` | `DONE`), `priority`, optional calendar `dueDate`, `createdAt`, nullable `deletedAt`.
- Public task representation still omits `deletedAt`.
- `GET /api/dashboard` is a derived aggregate, not a global task directory and not another user’s data.

**User / session / probe**

- Unchanged. No palette field. No dashboard preference field.

## 9. API and Integrations

The frontend remains the in-scope HTTP client. `credentials: 'include'`. CORS origin with credentials, not `*`.

Required capability:

- Authenticated owner-scoped project summaries, task summaries, and pending, completed, and overdue counts from persisted data, excluding soft-deleted tasks and excluding archived owned projects and their tasks.

Loading:

- Additive backend derived-read `GET /api/dashboard` (Q-048). Session cookie. Owner-scoped. HTTP schemas belong in the plan.
- Do not compose the dashboard from per-project task list GETs.
- Do not add `includeArchived` on `GET /api/projects`.

Existing routes remain as verified. `GET /health` and `GET /ready` stay public. Probes stay authenticated and off the product chrome.

There are no third-party dashboard integrations.

## 10. Security

- Authentication and authorization MUST remain distinct.
- Protected dashboard data MUST be enforced in the backend on `GET /api/dashboard`. Hiding UI is not authorization.
- External input MUST be validated with Zod at HTTP boundaries.
- Responses MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard, and MUST allow credentials.
- The session cookie remains HTTP-only. The frontend MUST NOT store a bearer token in JS.
- CSRF posture is unchanged (`SameSite=Lax`, CORS allowlist with credentials, JSON bodies).
- Do not implement membership checks “for later.”
- Soft-deleted tasks MUST NOT reappear via dashboard counts.
- Archived projects’ tasks MUST NOT reappear via dashboard counts.

## 11. Non-Functional

- Dashboard MUST be usable enough to read owner-wide and per-project summaries and the three counts; this feature MUST NOT restyle the whole workspace.
- Existing local Compose, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, Zod, React Router, Tailwind + copied shadcn, and Vitest + Testing Library + SuperTest MUST be reused.
- Numeric performance targets are not specified. Owner-wide aggregation in one derived-read is the chosen alternative to client N+1 lists.
- TypeScript strictness SHOULD catch boundary and domain typing issues.

## 12. Dependencies

- Existing features: `001-foundation` through `007-workspace-ui` Verified. Present: `frontend/`, `backend/`, Compose `frontend`/`backend`/`db`, domains `system`, `auth`, `users`, `projects`, `tasks`, destinations `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`, `AuthenticatedLayout`, session cookie `devtrack_session`.
- Architectural constraints: constitution v2.1.0; modular monolith; Prisma behind owning-domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`; no unauthorized database reset or volume delete; no new dashboard domain.
- External dependencies (already decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma 6; React; Vite; Express; Zod; React Router; Tailwind + copied shadcn; `@dnd-kit/core`; Vitest; Testing Library; SuperTest.
- New dependencies: none expected.

## 13. Failures and Edge Cases

- Missing/invalid/expired/revoked session: `401`; no dashboard data.
- Authenticated user with only another user’s data in the database: own dashboard is empty/zeros, not that other user’s data.
- Soft-deleted task: omitted from counts and summaries.
- Null due date: not overdue.
- Due today (UTC calendar date): not overdue.
- `DONE` with a past due date: completed, not overdue.
- Empty authorized active set: success with zeros / empty `projects`.
- Active owned project with zero live tasks: included in `projectCount` and in `projects` with zero task/pending/completed/overdue counts.
- Archived parent: excluded from dashboard; task writes on archived parents remain `409` as in `004-tasks`.
- Unknown query fields on `GET /api/dashboard`: `400` `VALIDATION_ERROR`.
- Database unreachable: `503` with envelope; no secrets leaked.
- Frontend cannot reach backend: UI error state; no database credentials involved.

## 14. Traceability

| Requirement | Acceptance criteria | Verification |
| ----------- | ------------------- | ------------ |
| FR-001, FR-006 | AC-001, AC-002, AC-003 | Owner dashboard; 401; non-owner isolation |
| FR-002, FR-010 | AC-001, AC-006, AC-009, AC-010, AC-013 | Owner-wide + per-project via `GET /api/dashboard` |
| FR-003 | AC-004 | Soft-deleted excluded |
| FR-004 | AC-005, AC-014 | Null / today not overdue; past UTC date overdue; `DONE` never |
| FR-005 | AC-007, AC-015 | Archived projects and tasks excluded |
| FR-007, FR-011 | AC-001, AC-008, AC-010, AC-017 | `/dashboard` additive; `/projects` and roots unchanged |
| FR-008, FR-009 | AC-009 | Use-case over existing repos; no dashboard Prisma model |
| FR-012 | AC-012 | Executed tests |
| FR-013 | AC-002, AC-008, AC-011 | Envelope; existing contracts |
| FR-014 | AC-008 | No members, audit, email, AI |
| FR-015 | AC-016 | Pending/completed mapping and overdue overlap |
| Empty data | AC-006 | Zeros, not error |

## 15. Open Questions

### Decided for this feature

- **Q-045:** Dashboard destination. Owner: product + frontend. Status: **Decided**. Add authenticated destination `/dashboard` in existing `AuthenticatedLayout` with a nav link in the top app bar. Keep authenticated `/` → `/projects`. Do not replace the `/projects` card grid. Do not change guest root → register. Keep the DevTrack brand link to `/projects`.
- **Q-046:** Overdue definition. Owner: product + `tasks`. Status: **Decided**. Overdue iff `dueDate` is a calendar date strictly before UTC today. Due today is on time. `DONE` is never overdue. Null `dueDate` is never overdue (FR-004).
- **Q-047:** Archived-project inclusion. Owner: product + `projects` + `tasks`. Status: **Decided**. Exclude archived owned projects and their tasks from all dashboard summaries and counts. Active owned projects only. Do not add `includeArchived` on `GET /api/projects`.
- **Q-048:** Aggregation loading. Owner: architecture + product. Status: **Decided**. Additive backend derived-read `GET /api/dashboard`. Session cookie, owner-scoped. Response: owner-wide project count, task count, pending, completed, overdue, plus per-project breakdown of the same. No extra lists/charts.
- **Q-049:** Pending and completed mapping. Owner: product + `tasks`. Status: **Decided**. Pending = `TODO` + `IN_PROGRESS`. Completed = `DONE`. A pending task may also count as overdue (overlap allowed). `DONE` never overdue.
- **Q-050:** Summary presentation. Owner: product + frontend. Status: **Decided**. Owner-wide totals plus per-project breakdown. No extra lists, due-soon, charts, or activity.

### Deferred (not required to implement this feature)

- **Q-006:** Dev vs production images. Owner: architecture. Status: Deferred.
- **Q-007:** Probe list retention. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Deferred.
- **Q-015:** Password complexity beyond non-empty. Owner: `auth`. Status: Deferred.
- **Q-017:** Rate limiting and account lockout. Owner: `auth`. Status: Deferred.

### Later product work (do not specify here)

- Collaboration / `project-members`. Out of this folder.
- App-wide CRUD audit. Later ID, **not** `005`/`006`/`007`. Do not write `specs/005-audit/`.
- Comments, labels, email, AI, calendar, search. See `proposed-features.md`.

## 16. Approval

- Requirements reviewed: Yes
- Material ambiguities resolved: Yes — Q-045, Q-046, Q-047, Q-048, Q-049, and Q-050 are Decided
- Approved for planning: Yes
- Approved for implementation: Yes
