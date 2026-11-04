# Feature Specification: Foundation

- **ID:** 001-foundation
- **Status:** Draft
- **Created:** 2026-10-26
- **Related features:** None

Fill every section that applies. Delete a section only when it is truly not relevant. Requirements must be testable.

## 1. Problem

DevTrack has governing documents and SDD templates, but no application source, containers, or persistence. Later product work cannot start until a runnable foundation exists and one vertical slice is verified through the required architecture path.

Without that slice, there is no evidence that React, Express, a domain repository, Prisma, and PostgreSQL can work together under the constitution.

## 2. Goals

- Provide a local Docker Compose environment with exactly three primary services: `frontend`, `backend`, and `db`.
- Place TypeScript application source under `frontend/` and `backend/` with Prisma schema and migrations under `backend/prisma/`.
- Verify one non-product vertical slice: React UI → Express route → controller → service → domain repository → Prisma → PostgreSQL.
- Prove database readiness is checked at runtime, not inferred from container start order.
- Keep secrets out of version control and out of API responses.

## 3. Non-Goals

- Authentication, registration, sessions, tokens, profiles, or password hashing.
- Projects, tasks, Kanban, dashboard, membership, roles, or collaboration.
- Microservices, a fourth primary Compose service, or a generic repository as the persistence layer.
- Frontend access to PostgreSQL or Prisma.
- CI, cloud deployment, and production hosting.
- Production image design (deferred; local Compose verification is the foundation done line).
- Client-side routing libraries and a design system.
- Inventing product entities to exercise the stack.
- Probe retention, pruning, or pagination as a product feature.

## 4. Actors and User Stories

### User Story US-001

As a developer, I want to start the three Compose services with documented commands, so that I can run DevTrack locally without assembling the stack by hand.

### User Story US-002

As a developer, I want backend liveness (`GET /health`) and readiness (`GET /ready`) checks, so that I can tell whether the API process is up and whether PostgreSQL is actually reachable.

### User Story US-003

As a developer, I want a React page that records a system probe and then shows persisted probes, so that I can verify the full architecture path against PostgreSQL.

### User Story US-004

As a developer, I want the UI and readiness check to fail in a controlled way when the database is unavailable, so that a green stack is not reported from container start order alone.

## 5. Functional Requirements

- **FR-001:** Docker Compose MUST define exactly three primary services named `frontend`, `backend`, and `db`.
- **FR-002:** `db` MUST be PostgreSQL 16 and MUST persist data in a named volume.
- **FR-003:** Configuration MUST come from environment variables. Secrets MUST NOT be committed or baked into images. A committed example env file MAY exist only with placeholders.
- **FR-004:** The browser MUST reach the backend over HTTP using the published backend host port and `VITE_API_URL`. The backend MUST enable CORS for the frontend origin. The frontend MUST NOT receive database credentials or access PostgreSQL.
- **FR-005:** The backend MUST connect to PostgreSQL on the Compose network using hostname `db`.
- **FR-006:** Prisma schema, migrations, Prisma Client, and migration tooling MUST belong to the backend and live under `backend/prisma/` for schema and migrations.
- **FR-007:** The backend MUST be a modular monolith. The foundation slice MUST live in a `system` domain that owns its controller, service, repository contract, Prisma repository, DTOs, routes, and validators. A generic repository MUST NOT be introduced.
- **FR-008:** Frontend and backend application code MUST use TypeScript with strict checking wherever practical. The package manager MUST be npm. Application Node.js runtime MUST be Node.js 22 LTS.
- **FR-009:** The `system` domain MUST persist a **system probe**: an append-only, non-product record that the system assigns an identity and recorded time. A client MUST be able to create a probe and list persisted probes through the backend.
- **FR-010:** The React UI MUST create a probe and display probes returned by the backend, covering loading, empty, success, and error states.
- **FR-011:** The backend MUST expose `GET /health` as a liveness check that does not require the database, and `GET /ready` as a readiness check that succeeds only when PostgreSQL is reachable through the `system` repository. Compose MUST NOT treat `db` as ready solely because the container has started.
- **FR-012:** External input MUST be validated at HTTP boundaries with Zod. Failed API responses MUST use HTTP status plus JSON `{ error: { code, message } }`. Responses MUST NOT include secrets, stack traces, password hashes, or raw database connection data.
- **FR-013:** Domain probe behavior MUST be testable without HTTP or Prisma. Repository or API behavior and critical UI behavior for the slice MUST also be tested. Automated tests MUST use Vitest, Testing Library (frontend), and SuperTest (HTTP API).
- **FR-014:** Application source MUST stay under `frontend/` or `backend/`. Specs MUST NOT contain implementation source.
- **FR-015:** Prisma MUST be used only behind the `system` domain repository. Request/response DTOs MUST stay separate from domain objects and Prisma models. Controllers MUST NOT query the database. Services MUST NOT issue ad hoc Prisma queries.
- **FR-016:** Documented development commands MUST exist for starting Compose, applying or deploying migrations, generating Prisma Client, and running the relevant checks.

## 6. Acceptance Criteria

### Scenario AC-001: Compose stack starts

- Given the repository contains the foundation Compose file and example configuration
- When a developer starts the stack with the documented command
- Then services `frontend`, `backend`, and `db` start, `db` is PostgreSQL 16, and `db` uses a named volume

### Scenario AC-002: Backend liveness

- Given the backend process is running
- When a client requests `GET /health`
- Then the backend responds `200` without requiring PostgreSQL

### Scenario AC-003: Backend readiness when the database is up

- Given the backend and PostgreSQL are reachable
- When a client requests `GET /ready`
- Then the check succeeds with `200` only after PostgreSQL is reachable through the `system` repository

### Scenario AC-004: Readiness fails without PostgreSQL

- Given the backend process is running and PostgreSQL is not reachable
- When a client requests `GET /ready`
- Then the check fails with a non-success HTTP status and body `{ error: { code, message } }`, and the response does not leak secrets, stack traces, or connection strings

### Scenario AC-005: First probe through the UI

- Given the running frontend, backend, and PostgreSQL
- When a developer uses the React UI to record a system probe
- Then the browser calls the backend at `VITE_API_URL`, the backend persists the probe via the `system` repository and Prisma, and the UI shows that probe after it is stored

### Scenario AC-006: Empty probe list

- Given PostgreSQL is reachable and no probes exist
- When the UI loads persisted probes
- Then the UI shows an empty state rather than a false error

### Scenario AC-007: Probe create fails when the database is down

- Given the frontend and backend are running and PostgreSQL is not reachable
- When the UI tries to record or load probes
- Then the UI shows an error state and the API returns `{ error: { code, message } }` without secrets, stack traces, or connection strings

### Scenario AC-008: Boundary validation

- Given a client sends a probe request that is not valid at the HTTP boundary
- When the backend handles the request
- Then it rejects the request with HTTP `400` and `{ error: { code, message } }`, without persisting a probe and without leaking internals

### Scenario AC-009: Architecture path

- Given the vertical slice is exercised
- When the request is handled
- Then control flows React UI → HTTP → Express route → controller → service → domain repository → Prisma → PostgreSQL, and Prisma types are not used as domain entities or public DTOs

### Scenario AC-010: Secrets stay out of the repo

- Given foundation configuration files
- When the repository is inspected
- Then no real secrets are committed, and example env files contain only placeholders

### Scenario AC-011: Automated checks

- Given the foundation tests and type checks
- When the documented commands are run
- Then domain tests pass without HTTP or Prisma, and Vitest, Testing Library, and SuperTest checks for the slice pass

## 7. Business Rules

- A system probe is a non-product, append-only record that proves persistence through the `system` domain — owning domain: `system`
- Probe identity and recorded time are assigned by the system, not by the client — owning domain: `system`
- Probe data MUST NOT be modeled as users, projects, tasks, or other product concepts — owning domain: `system`
- Unauthenticated access to liveness, readiness, and probe endpoints is allowed for this foundation feature only — owning domain: `system`
- The `system` domain MUST NOT call another domain's repository; no product domains are in scope — owning domain: `system`

## 8. Data

**System probe** (owned by `system`)

- Meaning: a stored proof that the backend wrote to and read from PostgreSQL.
- Identity: system-assigned unique identifier.
- Recorded time: system-assigned timestamp of persistence.
- Client-supplied product fields: none for this feature.
- Uniqueness: identity is unique; multiple probes MAY exist.
- Lifecycle: created and listed. Update, user deletion, archival, and retention policy are out of scope.
- Deletion: no user-facing delete in this feature.

No other business data is in scope.

## 9. API and Integrations

The frontend is the only in-scope HTTP client of the backend. The browser uses the published backend port and `VITE_API_URL`. The backend allows that frontend origin via CORS.

The backend MUST provide:

- `GET /health` — liveness; does not require PostgreSQL.
- `GET /ready` — readiness; requires PostgreSQL through the `system` repository.
- Create-probe capability at `POST /api/system/probes`.
- List-probes capability at `GET /api/system/probes`.

Request/response DTO field details belong in the plan. Error responses MUST use `{ error: { code, message } }` plus HTTP status. Probe and health endpoints are unauthenticated for this feature.

There are no third-party product integrations.

## 10. Security

- No authentication or authorization is implemented in this feature.
- Protected product operations are out of scope.
- Database credentials MUST exist only in backend/runtime environment configuration, never in the frontend or committed files.
- External input MUST be validated with Zod at the HTTP boundary even when the create-probe body has no product fields.
- Responses MUST use the error envelope on failures and MUST NOT include secrets, stack traces, password hashes, or sensitive database data.
- CORS MUST allow only the configured frontend origin, not a wildcard in this foundation plan.
- Leaving probe and health endpoints public is an accepted foundation risk and MUST be revisited when authentication is specified.

## 11. Non-Functional

- Local Compose startup MUST be documentable and repeatable.
- Database readiness MUST be observed, not assumed from start order.
- TypeScript strictness SHOULD catch boundary and domain typing issues during checks.
- The foundation UI MUST be usable enough to complete the probe flow; visual polish is not required.
- Numeric performance targets are not specified.

## 12. Dependencies

- Existing features: None. Repository currently contains governing docs, templates, and agent files only. No `frontend/`, `backend/`, Compose file, Prisma schema, or git metadata was present at specification time (inspected 2026-10-26; reconfirm at implementation).
- Architectural constraints: constitution v2.1.0; modular monolith; three Compose services; Prisma behind domain repositories; no generic repository; no microservices; application source under `frontend/` or `backend/`.
- External dependencies (decided): Docker Compose; PostgreSQL 16; Node.js 22 LTS; npm; Prisma; React; Vite; Express; Zod; Vitest; Testing Library; SuperTest; CORS middleware for the frontend origin.

## 13. Failures and Edge Cases

- PostgreSQL not yet healthy: backend MUST wait on observed readiness, not start-order alone.
- PostgreSQL unreachable after start: `GET /ready` and probe operations fail with the error envelope; UI shows error.
- Empty probe list: success with empty state.
- Invalid HTTP input for probe create: `400` with the error envelope; nothing persisted.
- Missing or placeholder secrets in a real run: backend MUST NOT start a working database connection with committed placeholder secrets treated as production values; local example files remain placeholders.
- Frontend cannot reach backend: UI error state, no database credentials involved.
- CORS mismatch (browser origin not allowed): browser blocks the request; UI error state. Fix is configuration, not a product workaround.
- Multiple probes: list includes previously persisted probes, including the one just created.

## 14. Traceability

| Requirement            | Acceptance criteria    | Verification                                                              |
| ---------------------- | ---------------------- | ------------------------------------------------------------------------- |
| FR-001, FR-002         | AC-001                 | Inspect Compose file; start stack; confirm named volume and PostgreSQL 16 |
| FR-003                 | AC-010                 | Inspect repo for committed secrets; review example env                    |
| FR-004, FR-005         | AC-001, AC-005         | Inspect Compose/network/env/`VITE_API_URL`/CORS; UI create-probe flow     |
| FR-006, FR-015         | AC-005, AC-009         | Inspect Prisma path, repository boundary, and slice tests                 |
| FR-007, FR-014         | AC-009                 | Inspect module layout and source roots                                    |
| FR-008, FR-013, FR-016 | AC-011                 | Run documented typecheck and Vitest/Testing Library/SuperTest checks      |
| FR-009, FR-010         | AC-005, AC-006, AC-007 | UI and API probe create/list                                              |
| FR-011                 | AC-002, AC-003, AC-004 | `GET /health` and `GET /ready`; DB-down case                              |
| FR-012                 | AC-004, AC-007, AC-008 | Invalid input and failure responses use the error envelope                |

## 15. Open Questions

### Resolved (do not reopen during implementation)

- **Q-001:** Browser reaches the backend via the published backend port and `VITE_API_URL`. The backend enables CORS for the frontend origin. Owner: architecture. Status: Resolved.
- **Q-002:** Runtime validation at HTTP boundaries uses Zod. Owner: architecture. Status: Resolved.
- **Q-003:** Tests use Vitest, Testing Library, and SuperTest. Owner: architecture. Status: Resolved.
- **Q-004:** Error JSON envelope is `{ error: { code, message } }` plus HTTP status. No secrets, stack traces, or connection strings. Owner: API. Status: Resolved.
- **Q-005:** Package manager is npm. Node.js is 22 LTS. PostgreSQL is 16. Owner: architecture. Status: Resolved.
- **Q-008:** Liveness path is `GET /health`. Readiness path is `GET /ready`. Owner: API. Status: Resolved (adopted from the plan).

### Deferred (not blocking this feature)

- **Q-006:** Dev vs production images and Compose overlays. Foundation verification is local Compose only. Owner: architecture. Status: Deferred. Must not be claimed done.
- **Q-007:** Probe list bound/retention (all rows vs recent N). List newest first for verification; do not invent a product retention policy. Owner: `system`. Status: Deferred.
- **Q-009:** CI and deployment. Owner: project. Status: Out of scope for this feature; remains open for later.

## 16. Approval

- Requirements reviewed: No
- Material ambiguities resolved: Blocking questions Q-001–Q-005 and Q-008 are resolved; Q-006, Q-007, and Q-009 remain deferred and are not blocking
- Approved for planning: No
- Approved for implementation: No
