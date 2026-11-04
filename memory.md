# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation, authentication, projects, tasks, frontend shell, Kanban, workspace UI, dashboard, collaboration, task comments, and task activity Verified

## Stack decisions

Verified for `001-foundation`, `002-authentication`, `005-frontend-shell`, `006-kanban`, and `007-workspace-ui` (including polish).

- Frontend: React, TypeScript, Vite, React Router 7 (SPA/library mode), Tailwind CSS 4, copied shadcn/ui primitives (`button`, `input`, `label`, `card`, `textarea`, `dialog`)
- Backend: Node.js 22 LTS, Express, TypeScript
- Package manager: npm
- Runtime validation: Zod at HTTP boundaries
- Tests: Vitest, Testing Library, SuperTest
- API errors: HTTP status plus `{ error: { code, message } }`; no secrets, stack traces, hashes, or connection strings
- Browser to API: published backend port + `VITE_API_URL`; CORS origin with credentials, not `*`
- Auth: HTTP-only session cookie `devtrack_session`; Argon2id; 7-day absolute expiry; logout revokes that session; concurrent sessions allowed
- Health: `GET /health` (public liveness), `GET /ready` (public readiness via `system` repository)
- Probes: `POST/GET /api/system/probes` require a session; no `SystemProbe` ownership; no product-UI destination (Q-030)
- ORM: Prisma 6 behind owning-domain repositories
- Database: PostgreSQL 16
- Infra: Docker Compose services `frontend`, `backend`, `db`
- Frontend talks to backend over HTTP (`credentials: 'include'`)
- Backend talks to Postgres on the Compose network using hostname `db`
- Prisma Client and migrations belong to the backend (`backend/prisma/`)
- Navigation is real URL destinations (React Router), not `App.tsx` view/state switching (Q-016 / Q-028)
- Styling is Tailwind + copied shadcn/ui with layout metaphors and original DevTrack identity: top app bar, compact left project sidebar, `/projects` card grid with name-derived covers (compact ~14–18rem, left-aligned), board-like project detail with remaining-height compact ~16–20rem `TODO` / `IN_PROGRESS` / `DONE` columns, Dialogs for create/edit/add-task/task-detail, whole-UI palettes from a documented catalog persisted in localStorage only (Q-029 / Q-031 / Q-032 / Q-033 / Q-036 / Q-037 / Q-038 / Q-041 / Q-042 / Q-044)
- Project-detail Kanban uses `@dnd-kit/core` only, including `DragOverlay`; cross-column drop PATCHes existing task `status`; same-column drop is a no-op; no `@dnd-kit/sortable`; no `position`/`rank` field (Q-034 / Q-035 / Q-043)
- Copied shadcn Dialog plus `@radix-ui/react-dialog` is allowed; no second CSS framework; no DropdownMenu; no Trello branding; no `next-themes` (Q-038 / Q-041)
- Whole-UI palette id is stored only in localStorage under `devtrack.uiPalette`. No profile API, cookie, or Prisma field. Logout does not clear it. Missing/unknown ids fall back to Forest.

## Governing files

- `prompt.md` — product direction
- `constitution.md` — binding rules
- `AGENTS.md` — agent instructions
- `implemented-features.md` — human catalog of Verified features and approach; update only after the user confirms a proposed patch
- `memory.md` — this file
- `.cursor/agents/` — isolated planner, implementer, reviewer (fresh subagent per stage; paths not file dumps)
- `.cursor/skills/sdd-workflow/SKILL.md` — SDD workflow
- `.specify/templates/` — spec, plan, and task templates
- `specs/` — feature artifacts

## Domains

Implemented: `system`, `auth`, `users`, `projects`, `tasks`, `project-members`. No new domain in `005-frontend-shell`, `006-kanban`, `007-workspace-ui`, `008-dashboard`, `010-task-comments`, or `011-task-activity` (dashboard aggregations, comments, and activity live in the `tasks` domain). `009-collaboration` added `project-members`.

Later candidates in `proposed-features.md`. App-wide CRUD audit (later feature ID, **not** `005`, **not** `006`, and **not** `007`; do not write `specs/005-audit/`).

## Proposed backlog

Foundation (Verified) → authentication (Verified) → projects (Verified) → tasks (Verified) → frontend-shell (Verified) → Kanban (Verified) → workspace-ui (Verified, including polish) → dashboard → collaboration → task comments → task activity → audit (later ID, not `005`).

Dashboard (`008-dashboard`), collaboration (`009-collaboration`), task comments (`010-task-comments`), and task activity (`011-task-activity`) are Verified. Extra Trello/Jira/email/AI ideas live in `proposed-features.md` for later choice; do not implement from that file. Do not write `specs/005-audit/`. Deferred next product choice: **E** labels (per-project catalog). Later **C** app-wide audit remains separate from task activity.

## Verified status

`001-foundation` Verified. `002-authentication` Verified. `003-projects` Verified. `004-tasks` Verified. `005-frontend-shell` Verified. `006-kanban` Verified. `007-workspace-ui` Verified (original T001–T013 and polish T014–T026). `008-dashboard` Verified (T001–T014). `009-collaboration` Verified (T001–T017). `010-task-comments` Verified (T001–T016). `011-task-activity` Verified (T001–T016). Reviewer for 008: PASS. Blocking: no. Failed ACs: none. Reviewer for 009: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 010: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 011: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. T001–T013 complete for 005. T001–T011 complete for 006. T001–T013 complete for original 007. T014–T026 complete for 007 polish. Reviewer for 005: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 006: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for original 007: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 007 polish (T025): PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor).

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- `system` probe slice; `auth` sessions; `users` identity/profile; owner-only `projects` with archive/unarchive; project-scoped `tasks` with soft-delete
- React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`, `/dashboard`; guest root → register; authenticated root → projects (not dashboard); unknown paths (including `/system/probes`) → not-found
- Additive `GET /api/dashboard` (session, **owner-scoped**, not membership) returns owner-wide `projectCount`, `taskCount`, `pendingCount`, `completedCount`, `overdueCount` plus per-project `id`/`name` and the same task counts. Pending = `TODO`+`IN_PROGRESS`; completed = `DONE`; overdue = non-`DONE` with `dueDate` strictly before UTC today; null/`DONE`/due-today never overdue; overlap pending∩overdue allowed. Active owned projects only; exclude archived and `deletedAt`. Aggregations in `tasks` use-case over `ProjectAccessPort`; no `dashboard` domain or Prisma dashboard model.
- Collaboration: domain `project-members`; roles `OWNER`/`EDITOR`/`VIEWER`; Prisma `ProjectMember`; `GET`/`POST /api/projects/:projectId/members`; `PATCH`/`DELETE .../members/:userId`; add by existing email `{ email, role }` with no mail. `GET /api/projects` lists active projects the actor is authorized to see. `ownerUserId` still grants OWNER. Create-project inserts OWNER membership atomically. Members Dialog on the board header. EDITOR: edit project + task writes, no archive/members admin. VIEWER: read/list only. Archived GET remains `ownerUserId` only.
- Task comments (`010-task-comments`, proposed **D**): owned by `tasks` (no peer comments domain). Prisma `TaskComment` / `task_comments` with nullable `deletedAt`. `POST`/`GET /api/tasks/:taskId/comments`; `PATCH`/`DELETE /api/tasks/:taskId/comments/:commentId`. Create = task write; list = task read via `TaskAuthorizationPort`; author-only PATCH body; soft-delete by author or effective OWNER (`requireProjectOwner`); no restore; plain text only; no mentions. Public DTO omits `deletedAt`. UI lives in existing `TaskDetail` Dialog.
- Task activity (`011-task-activity`, proposed **L**): owned by `tasks`. Prisma `task_activity_events` with kinds `TASK_CREATED`, `TASK_FIELDS_CHANGED`, `TASK_SOFT_DELETED`, `COMMENT_ADDED`. Emit in same DB transaction as create/update/softDelete/comment-create; fail write if event insert fails; no emit on no-op PATCH or comment edit/delete. Field-change: one event per PATCH with old/new for changed fields. Comment-added stores `commentId` + short body preview. `GET /api/tasks/:taskId/activity` → `{ activity }` newest-first full list via `requireTaskRead`; actor display name resolved at list time. Forward-only (no backfill). Read-only UI in `TaskDetail`. Not app-wide audit **C**.
- Authenticated chrome: top app bar (DevTrack → `/projects`, Color palette selector, Dashboard → `/dashboard`, profile, logout) and compact left sidebar of listed project names plus a create `+` Dialog; `/projects` main is a constrained card grid of listed (non-archived) projects with name-derived color-initials covers (empty/select-or-create main superseded); project detail has compact header (name, short description, Back to projects next to Edit/Archive) and remaining-height compact `TODO` / `IN_PROGRESS` / `DONE` columns; create-task and task-detail are Dialogs (board stays mounted); compact filters sit above the board; profile keeps the compact sidebar; guest login/register have no product sidebar and inherit stored-or-Forest palette
- Original FR-006 / Q-037 “remove Back to projects” is **superseded**: Back to projects is restored on the board header action row; DevTrack still links to `/projects`
- Whole-UI palettes from the Q-041 catalog (solids Forest default, Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier) applied on the document root; persisted only as catalog id in localStorage `devtrack.uiPalette`; guests use stored-or-Forest; logout does not clear the key
- `@dnd-kit/core` is present with `DragOverlay`; task cards use a pointer cursor; `@dnd-kit/sortable` is absent; no second DnD library; no task `position`/`rank`; no move endpoint; status moves reuse `PATCH /api/tasks/:id` `{ status }` with `credentials: 'include'`
- `ProbePage` and probe chrome removed from the React app; backend `system` probe HTTP, Prisma `SystemProbe`, `GET /health`, `GET /ready`, and backend probe tests unchanged
- Copied shadcn primitives only: `button`, `input`, `label`, `card`, `textarea`, `dialog`; peers `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-dialog`
- No `coverColor`, image storage, rank, audit, or User palette field. Dashboard counts are derived, not stored. Membership is persisted. `specs/005-audit/` is absent. Authenticated shell uses `h-svh overflow-hidden` so Kanban columns scroll inside remaining height.

Coordinator independently re-ran on Node.js `v22.22.3` for `011-task-activity` after T015 close-out:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 36 files / 287 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 186 tests passed

Coordinator independently re-ran on Node.js `v22.22.3` for `010-task-comments` after T015 close-out (flake fixes applied):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 31 files / 260 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 179 tests passed

Coordinator independently re-ran in Compose for `009-collaboration` after T013 (Node v22.23.4 in containers):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 26 files / 228 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 19 files / 169 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, backend restarted; no DB reset): owner board header **Members** Dialog; add existing `editor.009@example.com` as EDITOR; editor `/projects` shows the shared board; EDITOR chrome has Edit and Add task, not Archive or Members; editor `/dashboard` stays zeros (owner-only).

Coordinator independently re-ran in Compose for `008-dashboard` after T010 (Node v22.23.4 in containers):

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 21 files / 177 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 17 files / 141 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, backend restarted so `GET /api/dashboard` loaded; no DB reset): register → `/projects`; Dashboard nav → `/dashboard` empty zeros; create project → totals Projects 1; create TODO task; PATCH `dueDate` `2020-01-01` → pending 1 and overdue 1; DevTrack brand still `/projects` card grid; guest `/dashboard` → `/login`. Chrome MCP create-task date fill did not persist (dueDate stayed null until PATCH).

Coordinator independently re-ran on Node.js 22.13.0 for `007-workspace-ui` polish after T025:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 16 files / 133 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` card grid + Color palette select (Forest default, switched to Aurora gradient); board shows Back to projects next to Edit/Archive; narrower left-aligned columns; Back navigates to `/projects`; palette remains Aurora.

Prior coordinator re-run on Node.js 22.13.0 for original `007-workspace-ui` after the remaining-height shell fix (superseded by polish counts above):

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 14 files / 118 tests passed

Prior original-007 live browser pass on Compose (frontend rebuilt, no DB reset): `/projects` shows compact sidebar + card grid with SB cover (not Select a project); board had compact header Edit/Archive, no always-on forms, no Back to projects (superseded by polish Back restore); Edit opens dialog; Add task opens dialog without status field; task click opens Task detail dialog with board behind; column + Add buttons present.

Prior coordinator re-run on Node.js 22.13.0 for `006-kanban`:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 12 files / 107 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): login → project detail shows TODO/IN_PROGRESS/DONE columns; create task appears in TODO; keyboard DnD Space+ArrowRight+Space moved card to IN_PROGRESS; sidebar/chrome kept.

Prior coordinator re-run on Node.js 22.13.0 for `005-frontend-shell` (superseded by 006 counts above):

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 11 files / 92 tests passed

Prior 005 live browser pass on Compose (frontend rebuilt, no DB reset): guest `/` → `/register`, no sidebar; register → `/projects` with left sidebar + empty/select-or-create main; create project in sidebar; select project → `/projects/:id` with tasks list not columns; profile keeps sidebar; logout → `/login` no sidebar; guest `/projects` → `/login`; `/system/probes` → not-found, no probe UI. No drag-and-drop. Superseded on project-detail by 006 columns + keyboard DnD. `/projects` empty main superseded by 007 card grid.

Prior coordinator re-run on Node.js 22.22.3 for `004-tasks`:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 20 files / 158 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 11 files / 87 tests passed (superseded by 005 counts above)

## Migrations

- `backend/prisma/migrations/20261026120000_init_system_probe/`
- `backend/prisma/migrations/20261026133000_authentication/` (`User`, `AuthPasswordCredential`, `AuthSession`)
- `backend/prisma/migrations/20261027120000_projects/` (`Project`: name, optional description, `ownerUserId`, `archivedAt`)
- `backend/prisma/migrations/20261029150000_tasks/` (`Task`: title, optional description, status, priority, optional dueDate, `deletedAt`; FK to project)
- Applied with `prisma migrate deploy`. No database reset or volume delete.
- `005-frontend-shell` added no migrations and did not change Prisma schema.
- `006-kanban` added no migrations and did not change Prisma schema. No `position`/`rank` field.
- `007-workspace-ui` added no migrations and did not change Prisma schema. No `coverColor` field. No `position`/`rank` field. No User palette/theme field. Polish used localStorage `devtrack.uiPalette` only.
- `008-dashboard` added no migrations and did not change Prisma schema. No dashboard table or field.
- `009-collaboration`: `backend/prisma/migrations/20261031120000_project_members/` (`ProjectMember`, unique `(projectId, userId)`, FKs Restrict). Applied with `prisma migrate deploy`. No reset or volume delete. `Project.ownerUserId` kept.
- `010-task-comments`: `backend/prisma/migrations/20261104180000_task_comments/` (`TaskComment` / `task_comments`: `id`, `taskId`, `authorUserId`, `body`, `createdAt`, nullable `deletedAt`; FKs Restrict; `taskId` index). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.
- `011-task-activity`: `backend/prisma/migrations/20261104210000_task_activity/` (`task_activity_events`: `id`, `taskId`, `actorUserId`, `kind` enum, `payload` JSON, `createdAt`; FKs Restrict; indexes on `taskId` and `(taskId, createdAt)`). Additive only. Applied with `prisma migrate deploy`. No reset or volume delete.

## Known issues

- Q-006 production images deferred; local Compose uses Vite/tsx dev servers
- Q-007 probe list retention deferred
- Q-009 CI/deployment deferred
- Q-015 password complexity beyond non-empty deferred
- Q-017 rate limiting / lockout deferred
- Sidebar and `/projects` grid refetch is pathname-or-create-epoch keyed (`frontend/src/layout/AuthenticatedLayout.tsx` `reloadKey={`${location.pathname}:${projectListEpoch}`}`), so archive/rename can linger until navigation (007 independent review, non-blocking; not a failed AC). Create-project success bumps the shared epoch so sidebar and grid refresh without navigating.
- Copied Dialog CSS animate classes are unused (no `tailwindcss-animate` plugin); dismiss still works (007 informational, non-blocking)
- Radix Dialog marks the board `aria-hidden` while task detail is open; columns stay mounted behind the overlay (007 informational, non-blocking)
- Live palette contrast was not audited in T025 (informational). AC-018 was not re-executed by the polish reviewer; coordinator independently re-ran frontend typecheck (exit 0) and `npm test` (16 files / 133 tests passed, Node 22.13.0).
- Some project-cover slots retint with whole-UI theme tokens (007 polish T025, low/non-blocking). Covers remain name-derived; no stored `coverColor`.
- Dedicated Kanban drop tests cover 403 and archived 409 only; 400/401/404/network share the same revert path (006 independent review, non-blocking; not a failed AC)
- Authenticated users share a global probe list (no ownership, per Q-014); probe HTTP remains, product UI does not
- Projects are membership-authorized (`OWNER`/`EDITOR`/`VIEWER`); dashboard counts still use ownership, not membership
- Projects created before `009-collaboration` may have no OWNER membership row; `ownerUserId` still grants OWNER. New creates insert an OWNER row.
- Default project list excludes archived; recover archived only via detail GET (Q-021); no `includeArchived` sidebar filter
- Tasks are soft-deleted (`deletedAt`); HTTP DELETE does not remove the row; no restore API
- Archived projects still list/get tasks; create/update/soft-delete return 409
- HTTP 403 is not reachable on `/api/users/me` (no `/api/users/:id`); own-profile authz is in `users` service
- `CORS_ORIGIN=*` is not rejected at config load; current env uses the frontend origin
- Email uniqueness is a unique index plus canonical lowercase in write paths
- Prisma CLI high advisories left in place to stay on Prisma 6
- Backend typecheck excludes test files
- Persistence tests skip if `DATABASE_URL` is missing
- Agent default PATH may be Node 24 without `docker`; use nvm 22.22.3 and Docker Desktop CLI
- No dedicated Prisma persistence integration test for `TaskComment` when `DATABASE_URL` is set (010 independent review, non-blocking; coverage is domain/service/SuperTest + in-memory)
- SuperTest comment list does not explicitly assert cross-task exclusion; `listByTaskId` filters by `taskId` (010 independent review, non-blocking)
- Archived-project owner comment PATCH is not separately SuperTest-asserted; shares `assertParentWritable` with create/delete (010 independent review, informational)
- AC-015 same-tx emit failure covered via in-memory `SnapshotUnitOfWork` only; no Prisma insert-failure integration test (011 independent review, non-blocking)
- TaskDetail activity loads on open; does not auto-refresh after local task/comment mutations in the same dialog session (011 implementer note, informational)

## Next approved work

None queued. Verified through `011-task-activity`. Deferred product follow-up (specify when chosen): **E** per-project label catalog, many labels per task, show on card + filter. Later **C** app-wide audit stays a separate proposed feature (not this activity table). Do not implement from `proposed-features.md` without a new Approved feature folder.

## Open decisions

Resolved by `007-workspace-ui`:

- Q-036: `/projects` main content and project-card cover. Owner: product + frontend. Status: **Decided**. Use the main area for a grid of project cards. Cover is color + initials derived from the project name. No image upload, no `coverColor` field, no migration. Compact Trello-like card size is added by Q-044; cover derivation is unchanged.
- Q-037: Forms vs modals and compact chrome. Owner: product + frontend. Status: **Decided**, except the Back-to-projects clause. Compact sidebar names + create `+` modal. Project update is a modal. Archive/unarchive stay on board chrome actions. Add-task is a modal from board-header `+` and per-column `+` (column `+` pre-fills that column’s `status`). Task detail is a modal; the board stays visible. **Superseded:** “Remove always-visible Back to projects because the app name navigates to `/projects`.” Restore Back to projects next to Edit/Archive; keep the app-name link (FR-006).
- Q-038: Board presentation and Dialog. Owner: product + frontend. Status: **Decided**. Compact header (name, short description, actions) and compact filters above the board. Columns are the primary remaining-height focus (presentation, not dashboard aggregates). Compact column width is added by Q-044. Task cards show title, existing priority, and optional due date. Copied shadcn Dialog is allowed. No second CSS framework. No new domain.
- Q-039: Exact cover color and initials algorithm. Owner: frontend. Status: **Applied**. Deterministic hash of the project `name` into a small fixed DevTrack palette; initials from the first letter of the first two whitespace-separated tokens, else the first two characters, else one character; update when `name` changes.
- Q-040: Board-header `+` default status, and navigation after creating a project. Owner: product + frontend. Status: **Applied**. Header `+` omits `status` so the API default `TODO` applies. After successful create-project, close the modal, refresh the owner list, and stay on the current destination. Compact header actions are buttons (plus the restored Back control); DropdownMenu was not added.
- Q-041: Built-in whole-UI palette catalog. Owner: product + frontend. Status: **Decided**. Solids Forest (default), Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier. Persist only the palette id in localStorage. No profile API, no schema, no migration.
- Q-042: Palette selector placement and storage key. Owner: product + frontend. Status: **Decided**. Apply the palette on the document root. Compact accessible selector on the authenticated top app bar. Guests use stored-or-Forest; a guest-bar selector is not required. Persist only the catalog id under `devtrack.uiPalette`. Do not clear it on logout. Invalid/missing values → Forest.
- Q-043: Whether `@dnd-kit/sortable` is required for drag animation. Owner: frontend. Status: **Decided**. Not required. Use `@dnd-kit/core` `DragOverlay` and/or `useDraggable` `transform`. Do not add `@dnd-kit/sortable`. Keep Q-034 status-only moves.
- Q-044: Exact card and column widths. Owner: frontend. Status: **Decided**. Project cards: CSS grid with `auto-fill` plus a max card width of about 14–18rem, left-aligned, not full-main stretch. Kanban columns: compact max width of about 16–20rem, left-aligned row of three, remaining-height scroll inside the column. Unused main space MAY remain.

Resolved by `006-kanban`:

- Q-033: Keep vs replace the ungrouped 004/005 task list on project-detail. Owner: product + frontend. Status: **Decided**. Replace the ungrouped task list on `/projects/:projectId` with the Kanban board. No list/board toggle. Keep create, optional filters, and nested `TaskDetail`.
- Q-034: Within-column order and whether a persisted `position`/`rank` field is required. Owner: product + `tasks`. Status: **Decided**. Status-only. Drag between columns PATCHes existing task `status`. No `position`/`rank` field, no rank migration, no move endpoint. Same-column drop is a no-op (order not persisted). Within-column visual order stays existing list order (newest `createdAt` first per column).
- Q-035: Drag-and-drop library (additional dependency). Owner: frontend. Status: **Decided**. `@dnd-kit/core` as an explicit documented dependency, added only after the column board works. Do not add `@dnd-kit/sortable`. Do not add a second DnD library.

Resolved by `005-frontend-shell`:

- Q-016: Frontend routing and styling. Owner: frontend. Navigation is real URL destinations; styling is FR-009 / Q-031 layout metaphors with original DevTrack identity.
- Q-028: React Router (SPA/library mode, React 19 + Vite 7 compatible). Destinations are URLs, not `App.tsx` view flags.
- Q-029: Tailwind CSS + copied shadcn/ui and documented peers. No second CSS framework. No full catalog.
- Q-030: No product-UI destination for system probes. `ProbePage` removed; backend probe slice kept.
- Q-031: Layout metaphors only; original DevTrack identity; not a Trello clone. The “no Kanban columns / no drag-and-drop” part is **superseded on project-detail only** by `006-kanban`.
- Q-032: Authenticated left sidebar of the caller’s projects on product destinations; guest login/register have no product sidebar; verified list APIs/rules; profile keeps sidebar; archived detail URL keeps archive/unarchive; no `includeArchived` filter; persistent desktop sidebar is enough. The empty/select-or-create `/projects` main and always-visible create form are **superseded by `007-workspace-ui`**.

Deferred, not blocking:

- Dev vs production container configuration (Q-006)
- Probe list retention bound (Q-007)
- CI and deployment (Q-009)
- Password complexity beyond non-empty (Q-015)
- Rate limiting / lockout (Q-017)

Recorded as Decided and implemented in Verified `008-dashboard`:

- Q-045: Authenticated destination `/dashboard` in existing `AuthenticatedLayout` with a top-app-bar nav link. Keep authenticated `/` → `/projects`. Do not replace the `/projects` card grid. Do not change guest root → register.
- Q-046: Overdue iff `dueDate` is a calendar date strictly before UTC today. Due today is on time. `DONE` is never overdue. Null `dueDate` is never overdue.
- Q-047: Exclude archived owned projects and their tasks from all dashboard summaries and counts. Active owned projects only. Do not add `includeArchived` on `GET /api/projects`.
- Q-048: Additive backend derived-read `GET /api/dashboard`. Session cookie, owner-scoped. Owner-wide project count, task count, pending, completed, overdue, plus per-project breakdown of the same. No extra lists/charts. Aggregations in a `tasks` use-case over the projects port; no `dashboard` domain or Prisma dashboard model.
- Q-049: Pending = `TODO` + `IN_PROGRESS`. Completed = `DONE`. A pending task may also count as overdue. `DONE` never overdue.
- Q-050: Owner-wide totals plus per-project breakdown. No extra lists, due-soon, charts, or activity.

Recorded as Decided and implemented in Verified `009-collaboration`:

- Q-051: Roles `OWNER`, `EDITOR`, `VIEWER`.
- Q-052: OWNER: all project/task/membership ops. EDITOR: view + PATCH name/description + full task CRUD; no archive/unarchive; no membership admin. VIEWER: project/task read/list only. `ownerUserId` grants OWNER powers even without a membership row.
- Q-053: Add member by existing user email. POST `{ email, role }`. No mail. Unknown email → 404.
- Q-054: Insert creator as OWNER membership row. Only OWNER may manage members. Cannot remove `ownerUserId`. Cannot leave the project with no OWNER. No owner transfer.
- Q-055: `GET`/`POST /api/projects/:projectId/members`; `PATCH`/`DELETE .../members/:userId`. Prisma `ProjectMember` (`id`, `projectId`, `userId`, role enum, `createdAt`, unique `(projectId, userId)`, FKs Restrict). Duplicate → 409.
- Q-056: Members Dialog on the project board header. No members page. No workspace-ui redesign.
- Q-057: Non-owner members MUST NOT GET an archived project by id. Only `ownerUserId` may GET archived. Default list still excludes archived.

Recorded as Decided and implemented in Verified `010-task-comments`:

- Q-058: Author may `PATCH` own comment `body` only. Non-authors (including OWNER/EDITOR) MUST NOT edit.
- Q-059: Soft-delete via nullable `deletedAt`. Author or effective project OWNER may soft-delete. No restore API. Soft-deleted comments omitted from list and treated as not found on item ops.
- Q-060: Mentions out of scope — plain body only; no `@mention` parsing, storage, or notifications.
- Q-061: Plain text only. No Markdown/HTML rich-text requirement; no rich-text editor dependency.
- Q-062: Feature folder is comments only (proposed **D**). Do not implement card activity or labels here.
- Q-063: Create follows task write; list follows task read; edit author-only; soft-delete author OR effective OWNER.
- Q-064: Oldest `createdAt` first among live comments.
- Q-065: Comments owned by existing `tasks` domain.

Recorded as Decided and implemented in Verified `011-task-activity`:

- Q-066: Task activity ≠ app-wide audit **C**; no `specs/005-audit/`; C stays later/separate.
- Q-067: Activity owned under `tasks`.
- Q-068: List via task read (`requireTaskRead`).
- Q-069: Read-only section in `TaskDetail`; no new route; no board-card strip.
- Q-070: One field-change event per successful PATCH.
- Q-071: Field names + old/new for changed fields only.
- Q-072: No emit on no-op PATCH.
- Q-073: Newest `createdAt` first.
- Q-074: Forward-only; no backfill.
- Q-075: Comment-added stores `commentId` + short body preview.
- Q-076: Resolve `actorDisplayName` at list time.
- Q-077: Same DB transaction; fail write if event insert fails.
- Q-078: Full list; no pagination.
- Q-079: `GET /api/tasks/:taskId/activity` → `{ activity: [...] }`.

Do not silently turn an open question into an architectural decision.

## Memory rules

At session start: read governing files and inspect the repo.

After meaningful work, record verified changes, decisions and rationale, commands and actual results, known issues, remaining questions, and the next approved task.

Distinguish implemented, planned, proposed, and unverified. Never store secrets here.
