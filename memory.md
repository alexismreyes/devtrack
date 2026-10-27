# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation, authentication, and projects Verified

## Stack decisions

Verified for `001-foundation` and `002-authentication`.

- Frontend: React, TypeScript, Vite
- Backend: Node.js 22 LTS, Express, TypeScript
- Package manager: npm
- Runtime validation: Zod at HTTP boundaries
- Tests: Vitest, Testing Library, SuperTest
- API errors: HTTP status plus `{ error: { code, message } }`; no secrets, stack traces, hashes, or connection strings
- Browser to API: published backend port + `VITE_API_URL`; CORS origin with credentials, not `*`
- Auth: HTTP-only session cookie `devtrack_session`; Argon2id; 7-day absolute expiry; logout revokes that session; concurrent sessions allowed
- Health: `GET /health` (public liveness), `GET /ready` (public readiness via `system` repository)
- Probes: `POST/GET /api/system/probes` require a session; no `SystemProbe` ownership
- ORM: Prisma 6 behind owning-domain repositories
- Database: PostgreSQL 16
- Infra: Docker Compose services `frontend`, `backend`, `db`
- Frontend talks to backend over HTTP (`credentials: 'include'`)
- Backend talks to Postgres on the Compose network using hostname `db`
- Prisma Client and migrations belong to the backend (`backend/prisma/`)

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

Implemented: `system`, `auth`, `users`, `projects`.

Proposed, not specified: `tasks`, `project-members`

## Proposed backlog

Foundation (Verified) → authentication (Verified) → projects (Verified) → tasks → Kanban → dashboard → collaboration.

Later items are proposed, not specified.

## Verified status

`001-foundation` Verified. `002-authentication` Verified. `003-projects` Verified. T001–T017 complete for 003. Reviewer for 003: PASS WITH NON-BLOCKING FINDINGS after coordinator re-ran AC-015.

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- `system` probe slice; `auth` sessions; `users` identity/profile; owner-only `projects` with archive/unarchive
- Register/login/logout, own-profile, and project list/create/detail UI

Coordinator re-ran on Node.js 22.22.3 for `003-projects`:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 16 files / 113 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 9 files / 60 tests passed

## Migrations

- `backend/prisma/migrations/20261026120000_init_system_probe/`
- `backend/prisma/migrations/20261026133000_authentication/` (`User`, `AuthPasswordCredential`, `AuthSession`)
- `backend/prisma/migrations/20261027120000_projects/` (`Project`: name, optional description, `ownerUserId`, `archivedAt`)
- Applied with `prisma migrate deploy`. No database reset or volume delete.

## Known issues

- Q-006 production images deferred; local Compose uses Vite/tsx dev servers
- Q-007 probe list retention deferred
- Q-009 CI/deployment deferred
- Q-015 password complexity beyond non-empty deferred
- Q-016 frontend routing/styling deferred (view/state switching only)
- Q-017 rate limiting / lockout deferred
- Authenticated users share a global probe list (no ownership, per Q-014)
- Projects are owner-only; membership is later collaboration work
- Default project list excludes archived; recover archived only via detail GET (Q-021)
- HTTP 403 is not reachable on `/api/users/me` (no `/api/users/:id`); own-profile authz is in `users` service
- `CORS_ORIGIN=*` is not rejected at config load; current env uses the frontend origin
- Email uniqueness is a unique index plus canonical lowercase in write paths
- Prisma CLI high advisories left in place to stay on Prisma 6
- Backend typecheck excludes test files
- Persistence tests skip if `DATABASE_URL` is missing
- Agent default PATH may be Node 24 without `docker`; use nvm 22.22.3 and Docker Desktop CLI

## Next approved work

None. Specify the next feature (proposed: tasks) before implementation.

## Open decisions

Deferred, not blocking:

- Dev vs production container configuration (Q-006)
- Probe list retention bound (Q-007)
- CI and deployment (Q-009)
- Password complexity beyond non-empty (Q-015)
- Frontend routing and styling (Q-016)
- Rate limiting / lockout (Q-017)

Still unresolved for later product work:

- Project membership roles and permissions

Do not silently turn an open question into an architectural decision.

## Memory rules

At session start: read governing files and inspect the repo.

After meaningful work, record verified changes, decisions and rationale, commands and actual results, known issues, remaining questions, and the next approved task.

Distinguish implemented, planned, proposed, and unverified. Never store secrets here.
