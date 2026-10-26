# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation Verified; `002-authentication` Approved and Held

## Stack decisions

Verified for `001-foundation`. Do not treat this as product-feature implementation.

- Frontend: React, TypeScript, Vite
- Backend: Node.js 22 LTS, Express, TypeScript
- Package manager: npm
- Runtime validation: Zod at HTTP boundaries
- Tests: Vitest, Testing Library, SuperTest
- API errors: HTTP status plus `{ error: { code, message } }`; no secrets, stack traces, or connection strings
- Browser to API: published backend port + `VITE_API_URL`; backend CORS for the frontend origin
- Health: `GET /health` (liveness), `GET /ready` (readiness via `system` repository)
- ORM: Prisma 6 behind the `system` repository
- Database: PostgreSQL 16
- Infra: Docker Compose services `frontend`, `backend`, `db`
- Frontend talks to backend over HTTP
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

Implemented: `system` (non-product probe slice, DB reachability for readiness).

Specified, not implemented: `auth`, `users` (`002-authentication` Approved, Held).

Proposed, not specified: `projects`, `tasks`, `project-members`

## Proposed backlog

Foundation (Verified) → authentication (Approved, Held) → projects → tasks → Kanban → dashboard → collaboration.

Later items are proposed, not specified.

## Verified status

`001-foundation` is Verified. T001–T018 complete. Reviewer verdict: PASS WITH NON-BLOCKING FINDINGS.

Present in the repo:

- `frontend/`, `backend/`, `docker-compose.yml`
- Prisma schema `SystemProbe` and migration `20261026120000_init_system_probe`
- Probe UI and API: `POST/GET /api/system/probes`, `GET /health`, `GET /ready`

Coordinator re-ran on Node.js 22.22.3:

- `backend` `npm run typecheck` exit 0
- `backend` `npm test` 3 files / 21 tests passed
- `frontend` `npm run typecheck` exit 0
- `frontend` `npm test` 2 files / 10 tests passed

## Migrations

- `backend/prisma/migrations/20261026120000_init_system_probe/`
- Applied with `prisma migrate deploy`. No database reset or volume delete.

## Known issues

- Q-006 production images deferred; local Compose uses Vite/tsx dev servers
- Q-007 probe list retention deferred
- Q-009 CI/deployment deferred
- Probe endpoints are unauthenticated (accepted foundation risk)
- Prisma CLI high advisories left in place to stay on Prisma 6
- Backend typecheck excludes test files
- SuperTest persistence/`GET /ready` cases skip if `DATABASE_URL` is missing
- Agent default PATH may be Node 24 without `docker`; use nvm 22.22.3 and Docker Desktop CLI

## Next approved work

`002-authentication` T001–T018 are Approved and Held. Start only when explicitly requested.

Decided for that feature (not evidence of implementation):

- HTTP-only session cookie `devtrack_session`; `credentials: 'include'`; CORS origin with credentials, not `*`
- Login/register issue a session; logout revokes that session; 7-day absolute expiry; no refresh tokens; concurrent sessions allowed
- Unique identifier: case-insensitive email
- Profile: stored email + displayName; returned id/email/displayName; updatable displayName only
- `/health` and `/ready` stay public; probe create/list require authentication; no `SystemProbe` ownership
- Register also authenticates

## Open decisions

Deferred, not blocking `002-authentication`:

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
