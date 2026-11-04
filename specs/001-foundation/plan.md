# Implementation Plan: Foundation

- **Feature ID:** 001-foundation
- **Specification:** `spec.md`
- **Status:** Draft

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

## 1. Summary

Create the first runnable DevTrack tree from an empty application repo: `frontend/`, `backend/`, and a Compose file with `frontend`, `backend`, and `db`.

The only business slice is the `system` domain's **system probe**. That slice is a non-product persistence check, not a stand-in for projects or tasks. It exists so verification can follow:

React UI → HTTP → Express route → `system` controller → `system` service → `system` repository contract → Prisma implementation → PostgreSQL.

Prisma Client, schema, and migrations stay in the backend. The frontend never receives `DATABASE_URL` or other database secrets. Database readiness is observed through the `system` repository, not inferred from Compose start order.

Open questions in `spec.md` stay open. This plan proposes contracts needed to implement the slice and records alternatives where a choice is still required.

## 2. Current State

Inspected 2026-10-26. The repository is not an application yet.

Present:

- `constitution.md`, `prompt.md`, `memory.md`, `AGENTS.md`
- `.specify/templates/`
- `.cursor/agents/` and `.cursor/skills/sdd-workflow/`

Absent:

- `frontend/`, `backend/`
- `docker-compose.yml` or equivalent
- `package.json`, TypeScript configs, Dockerfiles
- Prisma schema and migrations
- `.gitignore`, `.env.example`
- `.git` metadata

There are no existing modules, coding conventions, or dependencies to extend. Implementation must create the layout, not retrofit one.

## 3. Domain Boundaries

- Owning domain: `system`
- Other domains: none in this feature. Proposed product domains (`auth`, `users`, `projects`, `tasks`, `project-members`) MUST NOT be created as empty shells.
- Invariants: a probe has system-assigned identity and recorded time; probes are append-only; probes are not product entities.
- Cross-domain interfaces: none.
- Dependency direction: `system` domain objects MUST NOT import Express, HTTP objects, Prisma Client, or database-driver APIs. Controllers depend on services. Services depend on domain behavior and the repository contract. The Prisma repository implements that contract in an inner persistence adapter. Shared infrastructure holds config, app bootstrap, Prisma Client construction, and centralized error mapping only.
- Controller, service, repository, DTOs, routes, validators, domain objects: all owned by `system` for probe create/list and for the database-readiness query used by readiness.

Suggested backend module root: `backend/src/modules/system/` with `domain/`, `dto/`, `repository/`, `service/`, `controller/`, `routes/`, `validators/`, and `tests/`. Adjust names only if the chosen backend layout convention is documented; do not add extra domains to satisfy the folder list.

## 4. API Contract

Unauthenticated for this feature. Final public URL prefix depends on Q-001 (browser-to-backend path). Paths below are the backend's own routes.

### `GET /health`

- Auth: none
- Request DTO: none
- Response DTO: liveness payload indicating the process is up. Exact JSON field names follow Q-004 if a shared envelope is chosen; until then the plan requires a success HTTP status and no sensitive fields.
- Validation: none
- Success: `200`
- Error cases: process down (no response)

This check MUST NOT query PostgreSQL.

### `GET /ready`

- Auth: none
- Request DTO: none
- Response DTO: readiness payload. Success means PostgreSQL was reachable through the `system` repository.
- Validation: none
- Success: `200` when the repository reports the database reachable
- Error cases: `503` when PostgreSQL is not reachable. Body MUST NOT include secrets, stack traces, or connection strings.

### `POST /api/system/probes`

- Auth: none
- Request DTO: empty object `{}` or empty body. No client identity or timestamp fields. Unknown required product fields are out of scope.
- Response DTO: `{ id: string, recordedAt: string }` where `recordedAt` is an ISO-8601 timestamp. Prisma models MUST NOT be returned.
- Validation: reject non-object JSON bodies when a body is present; reject attempts to supply server-owned fields if they are sent. Exact validator library is Q-002.
- Success: `201` with the created probe DTO
- Error cases:
  - `400` invalid body
  - `503` database unreachable
  - `500` unexpected failure, mapped by centralized handler, no internals leaked

### `GET /api/system/probes`

- Auth: none
- Request DTO: none
- Response DTO: `{ probes: Array<{ id: string, recordedAt: string }> }`
- Validation: none
- Success: `200`, including `{ probes: [] }` when none exist
- Error cases: `503` database unreachable; `500` unexpected failure without internals

List order: newest first. A maximum page size is Q-007; until decided, the implementation MUST still return at least the probes needed to satisfy AC-005 and MUST NOT invent a product retention feature.

### Error envelope

Status codes above are in scope. JSON shape is Q-004. Regardless of shape: no secrets, stack traces, hashes, or connection strings.

## 5. Persistence

- Prisma model changes: add a single `SystemProbe` mapped table owned by the `system` domain.
  - `id` unique, system-generated UUID string
  - `recordedAt` timestamp, system-set on insert
- Relationships, constraints, indexes: no foreign keys. Primary key on `id`. Index on `recordedAt` descending is optional and should be added only if listing needs it.
- Migration implications: first versioned migration under `backend/prisma/migrations/`. Creation, apply/deploy, and Client generation are separate documented steps. Local Compose may apply migrations on backend startup; that is not a substitute for versioned migration files. Production MUST use the deployment migration workflow when production is later specified (Q-006).
- Repository contracts:
  - `createProbe(): Promise<SystemProbe>`
  - `listProbes(): Promise<SystemProbe[]>`
  - `isDatabaseReachable(): Promise<boolean>` (or equivalent that does not leak driver errors to callers)
- Transactions: single-row insert does not require a multi-step transaction. Do not add a generic unit-of-work.
- Compatibility risks: none; greenfield schema. Do not reset or delete the named volume without explicit authorization later.

Do not expose Prisma models as domain entities or API DTOs. Map Prisma records to `system` domain objects inside the repository implementation, then map domain objects to DTOs at the controller/service boundary.

## 6. Frontend

Single-page foundation UI. No client router and no design system unless Q-001's chosen topology requires a tiny proxy-only config.

Page responsibilities:

- Load and display persisted probes
- Action to record a probe
- States: loading, empty, success (list with the created probe visible), error

API integration: a small typed client that calls the backend over HTTP. Base URL comes from frontend env (public API URL) or from the reverse-proxy path chosen in Q-001. The frontend MUST NOT contain Prisma, PostgreSQL hostnames, or `DATABASE_URL`.

State: local component/page state is enough. No global store.

Do not build project, task, auth, or dashboard screens.

## 7. Files

Expected new files and responsibility. Names may shift slightly with the chosen tooling (Q-005), but roots MUST remain `frontend/` and `backend/`.

**Root**

- `docker-compose.yml` — services `frontend`, `backend`, `db`; named volume; healthchecks; no committed secrets
- `.gitignore` — ignore env files, node_modules, build output, Prisma-generated artifacts that must not be committed if policy requires generate-on-build
- `.env.example` — placeholder names only

**backend/**

- `package.json`, `tsconfig.json`, `Dockerfile` — Express/TypeScript app, Prisma tooling
- `prisma/schema.prisma` — `SystemProbe` only
- `prisma/migrations/` — first migration
- `src/main.ts` (or `src/index.ts`) — process entry
- `src/app.ts` — Express app composition
- `src/config/` — env loading
- `src/infrastructure/prisma/` — Prisma Client construction only
- `src/infrastructure/http/` — centralized error handler, not domain logic
- `src/modules/system/domain/` — probe entity/invariants/errors
- `src/modules/system/dto/` — request/response DTOs
- `src/modules/system/validators/` — runtime schemas
- `src/modules/system/repository/` — contract + Prisma adapter
- `src/modules/system/service/` — create/list/readiness use cases
- `src/modules/system/controller/` — HTTP translation
- `src/modules/system/routes/` — route mapping
- `src/modules/system/tests/` — domain and relevant integration tests

**frontend/**

- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `Dockerfile`
- `src/main.tsx`, `src/App.tsx` — bootstrap and page
- `src/api/` — HTTP client for health/probes
- `src/system/` or equivalent page/components for the probe UI
- frontend tests beside the UI or under `src/` as chosen by Q-003

Do not create `specs/` implementation source. Do not add empty product domain folders.

## 8. Dependencies and Config

**Justified now**

- React, React DOM, TypeScript, Vite — constitution/prompt frontend stack
- Node.js, Express, TypeScript — backend HTTP
- Prisma, Prisma Client, PostgreSQL driver as required by Prisma — persistence
- Docker Compose — three services
- PostgreSQL image — `db`

**Required but not chosen (do not silently pick in this plan)**

- Runtime validation library (Q-002)
- Test frameworks (Q-003)
- Package manager and runtime versions (Q-005)
- CORS library vs reverse proxy (depends on Q-001)
- Dev vs production image strategy (Q-006)

**Environment (names, not values)**

- Backend: `DATABASE_URL`, PostgreSQL user/password/db name as consumed by `db` and Prisma
- Frontend: public HTTP base URL or empty base if same-origin proxy (Q-001)
- `db`: PostgreSQL credentials via env

Frontend env MUST NOT include database credentials. Real values live in uncommitted env files. Images MUST NOT bake secrets.

**Compose**

- `db` healthcheck (for example `pg_isready`) so dependents wait on readiness, not start order
- `backend` depends on healthy `db`, runs Prisma Client generate + migration workflow, then the API
- `frontend` talks only to backend HTTP, never to `db`
- Named volume on `db` data directory
- Hostname `db` in backend `DATABASE_URL`

## 9. Security and Failures

- No authn/authz in this feature. Public probe endpoints are a documented risk.
- Validate at HTTP entry. Controllers do not touch Prisma.
- Map repository/infrastructure errors to HTTP statuses in one handler. Log safely server-side if logging is added; do not echo internals.
- Readiness and probe failures while DB is down: `503`, UI error state.
- Invalid JSON/body: `400`, no insert.
- Never return `DATABASE_URL`, Postgres password, or stack traces.

## 10. Testing

| Requirement                                | Test                                                        |
| ------------------------------------------ | ----------------------------------------------------------- |
| Probe identity/time assigned by system     | `system` domain unit tests, no HTTP/Prisma                  |
| create/list use cases                      | `system` service tests with a fake repository               |
| Prisma mapping and SQL persistence         | repository or API test against PostgreSQL (framework Q-003) |
| `POST`/`GET` `/api/system/probes` statuses | API tests                                                   |
| `/health` does not need DB; `/ready` does  | API tests                                                   |
| Invalid body → 400                         | API tests                                                   |
| UI loading/empty/success/error             | frontend tests (Q-003) plus Compose verification of AC-005  |
| Secrets not committed                      | repo inspection                                             |

Do not claim tests passed without running them. Destructive DB resets and volume deletes are out of scope unless later authorized.

## 11. Sequence

1. Confirm this spec/plan/tasks are approved. Do not implement while Draft.
2. Add root gitignore, env example, and Compose `db` service with named volume and healthcheck.
3. Scaffold `backend/` TypeScript/Express without product domains.
4. Add Prisma schema and first `SystemProbe` migration; document generate vs migrate vs deploy.
5. Implement `system` domain, repository contract, Prisma adapter, service, DTOs, validators, controller, routes.
6. Wire liveness (no DB) and readiness (repository).
7. Add backend tests that can run with the chosen framework (Q-003).
8. Scaffold `frontend/` Vite React TypeScript app and probe UI against the agreed HTTP path (Q-001).
9. Add frontend tests.
10. Add Compose `frontend` and `backend` services, env wiring, health-based startup.
11. Run typecheck, targeted tests, and AC scenarios on the running stack.
12. Independent review; update `memory.md` from verified results only.

## 12. Risks

- **Q-001 unresolved:** the UI cannot be verified if the browser cannot reach the backend. Alternatives: publish backend port + `VITE_API_URL`, frontend nginx/`/api` proxy, or Vite proxy for dev only. Do not mix them silently.
- **Public probe API:** acceptable for foundation; must not carry into auth work unchanged.
- **Unbounded probe rows:** Q-007. Low risk for local verification; do not invent pruning.
- **Empty product modules:** creating unused `auth`/`projects` folders would violate “no empty components” and educational clarity.
- **Generic repository temptation:** a shared CRUD base would violate the constitution. Keep one `system` repository.
- **Prisma as a fourth service:** forbidden. Keep tooling in `backend`.
- **Start-order false positives:** mitigated by `db` healthcheck, backend `depends_on` condition, and `/ready` through the repository.
- **Secrets in images or frontend build:** mitigated by env-only config and review of Dockerfiles/build args.
- **Production hardening claimed too early:** Q-006 remains open; local Compose verification is the done line for this feature.

## 13. Traceability

| Acceptance criterion | Implementation                          | Verification                                   |
| -------------------- | --------------------------------------- | ---------------------------------------------- |
| AC-001               | Compose three services, named volume    | `docker compose` start; inspect config         |
| AC-002               | `GET /health`                           | API test + running stack                       |
| AC-003               | `GET /ready` via `system` repository    | API test + running stack                       |
| AC-004               | readiness failure mapping               | API test with DB down or equivalent            |
| AC-005               | UI create + list probes                 | frontend test + Compose UI/API check           |
| AC-006               | empty list DTO + empty UI               | API + frontend tests                           |
| AC-007               | 503 + UI error                          | API + frontend error-state test                |
| AC-008               | validators on `POST /api/system/probes` | API test                                       |
| AC-009               | `system` module layout and mapping      | review + tests that avoid Prisma types in DTOs |
| AC-010               | `.gitignore` + `.env.example`           | repo inspection                                |
| AC-011               | documented test/typecheck commands      | executed checks                                |

## 14. Approval

- Specification reviewed: No
- Architecture reviewed: No
- Risks understood: No
- Approved for task breakdown: No
