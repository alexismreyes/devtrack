# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation, authentication, projects, tasks, frontend shell, Kanban, and workspace UI (original pass plus polish) Verified

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
- `memory.md` — this file
- `.cursor/agents/` — isolated planner, implementer, reviewer (fresh subagent per stage; paths not file dumps)
- `.cursor/skills/sdd-workflow/SKILL.md` — SDD workflow
- `.specify/templates/` — spec, plan, and task templates
- `specs/` — feature artifacts

## Domains

Implemented: `system`, `auth`, `users`, `projects`, `tasks`. No new domain in `005-frontend-shell`, `006-kanban`, or `007-workspace-ui`.

Proposed, not specified: `project-members`; app-wide CRUD audit (later feature ID, **not** `005`, **not** `006`, and **not** `007`; do not write `specs/005-audit/`)

## Proposed backlog

Foundation (Verified) → authentication (Verified) → projects (Verified) → tasks (Verified) → frontend-shell (Verified) → Kanban (Verified) → workspace-ui (Verified, including polish) → dashboard → collaboration → audit (later ID, not `005`).

Later items are proposed, not specified. Dashboard, collaboration, and audit remain unimplemented. Do not write `specs/005-audit/`. This polish stayed in `007-workspace-ui`; `specs/008-*` was not created for it.

## Verified status

`001-foundation` Verified. `002-authentication` Verified. `003-projects` Verified. `004-tasks` Verified. `005-frontend-shell` Verified. `006-kanban` Verified. `007-workspace-ui` Verified (original T001–T013 and polish T014–T026). T001–T013 complete for 005. T001–T011 complete for 006. T001–T013 complete for original 007. T014–T026 complete for 007 polish. Reviewer for 005: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 006: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for original 007: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Reviewer for 007 polish (T025): PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none. Informational: live contrast not audited in review; AC-018 not re-executed by reviewer. Low: some project-cover slots retint with the theme tokens (still name-derived, no stored coverColor).

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- `system` probe slice; `auth` sessions; `users` identity/profile; owner-only `projects` with archive/unarchive; project-scoped `tasks` with soft-delete
- React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → projects; unknown paths (including `/system/probes`) → not-found
- Authenticated chrome: top app bar (DevTrack → `/projects`, Color palette selector, profile, logout) and compact left sidebar of listed project names plus a create `+` Dialog; `/projects` main is a constrained card grid of listed (non-archived) projects with name-derived color-initials covers (empty/select-or-create main superseded); project detail has compact header (name, short description, Back to projects next to Edit/Archive) and remaining-height compact `TODO` / `IN_PROGRESS` / `DONE` columns; create-task and task-detail are Dialogs (board stays mounted); compact filters sit above the board; profile keeps the compact sidebar; guest login/register have no product sidebar and inherit stored-or-Forest palette
- Original FR-006 / Q-037 “remove Back to projects” is **superseded**: Back to projects is restored on the board header action row; DevTrack still links to `/projects`
- Whole-UI palettes from the Q-041 catalog (solids Forest default, Ocean, Sunset, Violet, Midnight; gradients Aurora, Ember, Lagoon, Twilight, Citrus, Magma, Glacier) applied on the document root; persisted only as catalog id in localStorage `devtrack.uiPalette`; guests use stored-or-Forest; logout does not clear the key
- `@dnd-kit/core` is present with `DragOverlay`; task cards use a pointer cursor; `@dnd-kit/sortable` is absent; no second DnD library; no task `position`/`rank`; no move endpoint; status moves reuse `PATCH /api/tasks/:id` `{ status }` with `credentials: 'include'`
- `ProbePage` and probe chrome removed from the React app; backend `system` probe HTTP, Prisma `SystemProbe`, `GET /health`, `GET /ready`, and backend probe tests unchanged
- Copied shadcn primitives only: `button`, `input`, `label`, `card`, `textarea`, `dialog`; peers `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-dialog`
- No `coverColor`, image storage, rank, dashboard aggregates, members, audit, or User palette field. `specs/005-audit/` is absent. `specs/008-*` was not created. Authenticated shell uses `h-svh overflow-hidden` so Kanban columns scroll inside remaining height.

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
- Projects are owner-only; membership is later collaboration work
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

## Next approved work

No approved implementation task. `007-workspace-ui` (original T001–T013 and polish T014–T026) is Verified. Next proposed product work is dashboard (not specified). Do not start dashboard, collaboration, or audit without approved artifacts. Later audit MUST NOT use ID `005` and MUST NOT be written as `specs/005-audit/`. This polish stayed in `007-workspace-ui`; `specs/008-*` was not created for it.

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

Still unresolved for later product work:

- Project membership roles and permissions

Do not silently turn an open question into an architectural decision.

## Memory rules

At session start: read governing files and inspect the repo.

After meaningful work, record verified changes, decisions and rationale, commands and actual results, known issues, remaining questions, and the next approved task.

Distinguish implemented, planned, proposed, and unverified. Never store secrets here.
