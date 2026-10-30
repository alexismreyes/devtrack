# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation, authentication, projects, tasks, and frontend shell Verified

## Stack decisions

Verified for `001-foundation`, `002-authentication`, and `005-frontend-shell`.

- Frontend: React, TypeScript, Vite, React Router 7 (SPA/library mode), Tailwind CSS 4, copied shadcn/ui primitives
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
- Styling is Tailwind + copied shadcn/ui with layout metaphors and original DevTrack identity: top app bar, left project sidebar, card-like surfaces, board-like project detail hosting the existing task list (Q-029 / Q-031 / Q-032)

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

Implemented: `system`, `auth`, `users`, `projects`, `tasks`. No new domain in `005-frontend-shell`.

Proposed, not specified: `project-members`; app-wide CRUD audit (later feature ID, **not** `005`; do not write `specs/005-audit/`)

## Proposed backlog

Foundation (Verified) → authentication (Verified) → projects (Verified) → tasks (Verified) → frontend-shell (Verified) → Kanban → dashboard → collaboration → audit (later ID, not `005`).

Later items are proposed, not specified. Kanban, dashboard, collaboration, and audit remain unimplemented.

## Verified status

`001-foundation` Verified. `002-authentication` Verified. `003-projects` Verified. `004-tasks` Verified. `005-frontend-shell` Verified. T001–T013 complete for 005. Reviewer for 005: PASS WITH NON-BLOCKING FINDINGS. Blocking: no. Failed ACs: none.

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- `system` probe slice; `auth` sessions; `users` identity/profile; owner-only `projects` with archive/unarchive; project-scoped `tasks` with soft-delete
- React Router destinations: `/register`, `/login`, `/projects`, `/projects/:projectId`, `/profile`; guest root → register; authenticated root → projects; unknown paths (including `/system/probes`) → not-found
- Authenticated chrome: top app bar (DevTrack, profile, logout) and left sidebar of the caller’s projects; `/projects` main is empty/select-or-create; project detail hosts existing tasks as a list, not Kanban columns; profile keeps the sidebar; guest login/register have no product sidebar
- `ProbePage` and probe chrome removed from the React app; backend `system` probe HTTP, Prisma `SystemProbe`, `GET /health`, `GET /ready`, and backend probe tests unchanged
- Copied shadcn primitives only: `button`, `input`, `label`, `card`, `textarea`; peers `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `@radix-ui/react-label`

Coordinator independently re-ran on Node.js 22.13.0 for `005-frontend-shell`:

- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 11 files / 92 tests passed

Coordinator live browser pass on Compose (frontend rebuilt, no DB reset): guest `/` → `/register`, no sidebar; register → `/projects` with left sidebar + empty/select-or-create main; create project in sidebar; select project → `/projects/:id` with tasks list not columns; profile keeps sidebar; logout → `/login` no sidebar; guest `/projects` → `/login`; `/system/probes` → not-found, no probe UI. No drag-and-drop.

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

## Known issues

- Q-006 production images deferred; local Compose uses Vite/tsx dev servers
- Q-007 probe list retention deferred
- Q-009 CI/deployment deferred
- Q-015 password complexity beyond non-empty deferred
- Q-017 rate limiting / lockout deferred
- Sidebar list refetch is pathname-keyed (`frontend/src/layout/AuthenticatedLayout.tsx` `reloadKey={location.pathname}`), so an archived project can remain in the sidebar until navigation (005 independent review, non-blocking; not a failed AC)
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

None specified. Proposed later product work (not specified, not implemented): Kanban columns and drag-and-drop; dashboard aggregates; collaboration / `project-members`; app-wide CRUD audit. Later audit MUST NOT use feature ID `005` and MUST NOT be written as `specs/005-audit/`. Nested task-detail URLs and mobile sidebar collapse remain optional/unspecified.

## Open decisions

Resolved by `005-frontend-shell`:

- Q-016: Frontend routing and styling. Owner: frontend. Navigation is real URL destinations; styling is FR-009 / Q-031 layout metaphors with original DevTrack identity.
- Q-028: React Router (SPA/library mode, React 19 + Vite 7 compatible). Destinations are URLs, not `App.tsx` view flags.
- Q-029: Tailwind CSS + copied shadcn/ui and documented peers. No second CSS framework. No full catalog.
- Q-030: No product-UI destination for system probes. `ProbePage` removed; backend probe slice kept.
- Q-031: Layout metaphors only; original DevTrack identity; not a Trello clone; no Kanban columns, drag-and-drop, or card dragging.
- Q-032: Authenticated left sidebar of the caller’s projects on product destinations; empty/select-or-create main when none selected; guest login/register have no product sidebar; verified list APIs/rules; create-project in chrome; profile keeps sidebar; archived detail URL keeps archive/unarchive; no `includeArchived` filter; persistent desktop sidebar is enough.

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
