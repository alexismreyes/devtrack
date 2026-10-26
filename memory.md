# DevTrack — Project Memory

## Identity

- Name: DevTrack
- Purpose: Project and task management for individuals and small teams
- Architecture: Modular monolith
- Stage: Foundation specified and Approved; implementation Held

## Stack decisions

Recorded as decided for Approved `001-foundation`. Not evidence of implementation.

- Frontend: React, TypeScript, Vite
- Backend: Node.js 22 LTS, Express, TypeScript
- Package manager: npm
- Runtime validation: Zod at HTTP boundaries
- Tests: Vitest, Testing Library, SuperTest
- API errors: HTTP status plus `{ error: { code, message } }`; no secrets, stack traces, or connection strings
- Browser to API: published backend port + `VITE_API_URL`; backend CORS for the frontend origin
- Health: `GET /health` (liveness), `GET /ready` (readiness via `system` repository)
- ORM: Prisma
- Database: PostgreSQL 16
- Infra: Docker Compose services `frontend`, `backend`, `db`
- Frontend talks to backend over HTTP
- Backend talks to Postgres on the Compose network
- Prisma Client and migrations belong to the backend

Do not assume packages or services exist without inspecting the repo.

## Governing files

- `prompt.md` — product direction
- `constitution.md` — binding rules
- `AGENTS.md` — agent instructions
- `memory.md` — this file
- `.cursor/agents/` — isolated planner, implementer, reviewer (fresh subagent per stage; paths not file dumps)
- `.cursor/skills/sdd-workflow/SKILL.md` — SDD workflow
- `.specify/templates/` — spec, plan, and task templates
- `specs/` — feature artifacts

## Proposed domains

`auth`, `users`, `projects`, `tasks`, `project-members`

These are proposed. They are not evidence of implementation.

## Proposed backlog

Foundation → authentication → projects → tasks → Kanban → dashboard → collaboration.

These are proposed work items, not implemented features.

## Verified status

Foundation documentation and Approved `001-foundation` artifacts only. Implementation is Held: do not start T001–T018 until explicitly requested. The app, Docker environment, Prisma schema, modules, and tests do not exist yet.

Do not claim the app, Docker environment, Prisma schema, modules, or tests exist until inspected.

## Next approved work

`001-foundation` T001–T018 are Approved and Held. Start only when explicitly requested.

## Open decisions

Deferred, not blocking `001-foundation`:

- Dev vs production container configuration (Q-006)
- Probe list retention bound (Q-007)
- CI and deployment (Q-009)

Still unresolved for later product work:

- Frontend routing and styling
- Auth/session strategy
- Project membership roles and permissions

Do not silently turn an open question into an architectural decision.

## Memory rules

At session start: read governing files and inspect the repo.

After meaningful work, record verified changes, decisions and rationale, commands and actual results, known issues, remaining questions, and the next approved task.

Distinguish implemented, planned, proposed, and unverified. Never store secrets here.
