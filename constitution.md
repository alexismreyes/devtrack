# DevTrack Constitution

**Version:** 2.1.0

## Article I — Specification-First Development

Significant features MUST have an approved `spec.md`, `plan.md`, and `tasks.md` before implementation.

Specifications MUST include testable acceptance criteria. Plans MUST cover architecture, domains, persistence, API contracts, and verification. Tasks MUST be small enough to implement and verify individually.

The implementation MUST NOT invent material product requirements.

The main agent MUST coordinate using the SDD skill and the planner, implementer, and reviewer agents.

## Article II — Domain-Driven Design

The backend MUST be a modular monolith organized by business domain.

Each domain MUST own its business rules and, where applicable, its controller, service, repository, DTO, and routes.

A domain MUST NOT access another domain's internal repository implementation. Cross-domain calls MUST use explicit, narrow interfaces and preserve the owning domain's invariants. Circular dependencies MUST be avoided.

Microservices MUST NOT be introduced without an approved architectural decision.

## Article III — Repository and DTO Boundaries

Each domain MUST have its own repository abstraction and persistence implementation. A generic repository MUST NOT be the universal persistence layer.

Repositories MUST encapsulate Prisma access and mapping.

Request and response DTOs MUST stay separate from domain entities and Prisma models. Prisma types MUST NOT be treated as domain entities or public DTOs.

Controllers MUST NOT query the database. Services MUST NOT bypass repositories with ad hoc Prisma queries.

## Article IV — Dependency Direction

Domain logic MUST NOT depend on Express, HTTP objects, Prisma Client, or database-driver APIs.

Controllers MUST delegate to services. Services MUST use domain behavior and repository contracts. Routes MUST own HTTP mappings and middleware.

Runtime validation MUST happen at external input boundaries. Shared infrastructure MUST contain only cross-cutting concerns.

## Article V — Prisma and PostgreSQL

PostgreSQL MUST be the database. Prisma MUST be the ORM, used only behind domain repositories.

Schema and migrations MUST live under `backend/prisma/` and MUST be version-controlled.

The workflow MUST distinguish migration creation, application, and Prisma Client generation. Production MUST use the deployment migration workflow.

Constraints, foreign keys, and indexes MUST be used where appropriate. Atomic operations MUST use transactions. Database readiness MUST NOT be inferred from container start order alone.

## Article VI — Container Architecture

Three primary Compose services MUST exist:

- `frontend`: React
- `backend`: Express, Prisma Client, and migration tooling
- `db`: PostgreSQL

Prisma MUST NOT be a fourth primary service. The frontend MUST talk to the backend over HTTP and MUST NOT access PostgreSQL. The backend MUST use the Compose network and the `db` hostname.

Database data MUST persist in a named volume. Configuration MUST come from environment variables. Secrets MUST NOT be committed or baked into images.

## Article VII — TypeScript and Quality

Frontend and backend application code MUST use TypeScript with strict checking wherever practical. `any` MUST be avoided unless justified and narrowly scoped.

Business invariants MUST be testable without HTTP or persistence. Contract changes MUST be authorized by the relevant specification. Unrelated refactoring MUST NOT ride along with feature work.

## Article VIII — Security

Passwords MUST be hashed with an appropriate algorithm. Authentication and authorization MUST remain distinct. Protected operations MUST enforce resource-level access in the backend, not only in the frontend.

External input MUST be validated. Secrets, stack traces, password hashes, and sensitive database data MUST NOT appear in API responses.

## Article IX — Testing and Verification

Important domain invariants, services, repositories, API boundaries, and critical frontend behavior MUST be tested at the appropriate boundary.

Relevant checks MUST run before a task is reported complete. Agents MUST report actual results and MUST NOT claim unexecuted checks passed.

A reviewer MUST assess specification compliance, architecture, security, data integrity, and verification evidence.

## Article X — Artifacts and Source of Truth

Feature specs MUST live under `specs/<feature-id>-<feature-name>/` with `spec.md`, `plan.md`, and `tasks.md`. Templates MUST live under `.specify/templates/`.

Application source MUST stay under `frontend/` or `backend/`. Specs MUST NOT become an alternate implementation tree.

Verified repository state takes precedence over stale memory. Conflicting specifications MUST be resolved before implementation continues.

## Article XI — Documentation and Memory

- `prompt.md`: product and technical direction
- `constitution.md`: binding rules
- `AGENTS.md`: AI coding instructions
- `memory.md`: concise durable state and decisions
- `.cursor/agents/`: Cursor subagents
- `.cursor/skills/sdd-workflow/SKILL.md`: SDD workflow

Documentation and memory MUST be updated after material decisions or status changes. Memory MUST distinguish implemented, planned, proposed, and unverified work.

## Article XII — Agent Responsibilities

The planner MUST produce requirements, plans, and tasks without claiming unimplemented features exist.

The implementer MUST stay in approved scope and report verification honestly.

The reviewer MUST assess independently and MUST NOT treat implementer claims as proof.

The main agent MUST coordinate, resolve conflicts, and preserve the approved specification.

Constitutional conflicts MUST be reported, not bypassed.

## Article XIII — Educational Value

Implementations SHOULD favor clear, explainable practices. Patterns MUST solve real requirements, not maximize abstraction.

## Definition of Done

A change is complete only when it meets the approved specification and acceptance criteria, respects architectural boundaries, includes appropriate tests and migrations, passes executed checks, and has updated documentation.

## Amendment Policy

Constitutional changes MUST be explicit, justified, and versioned. Feature specs and plans MUST comply with the current constitution.
