# DevTrack — Product Direction

## Vision

DevTrack is a project and task manager for individuals and small teams. Users create projects, organize tasks, manage priorities and deadlines, collaborate through membership, and track progress on a dashboard and Kanban board.

This is an educational project for SDD, DDD, React, TypeScript, Express, Prisma, PostgreSQL, Docker, and Cursor workflows.

Build incrementally from approved specifications. Do not implement the whole product in one unplanned change.

## Stack

| Layer | Choices |
| --- | --- |
| Frontend | React, TypeScript, Vite, documented client routing, maintainable API client |
| Backend | Node.js, Express, TypeScript, REST, Prisma, PostgreSQL, runtime validation, centralized errors |
| Infra | Docker Compose with `frontend`, `backend`, and `db`; named volume for Postgres; env-based config; health checks; versioned Prisma migrations |

Additional dependencies require an explicit documented decision.

## Containers

1. `frontend` — React, built and served in its own container
2. `backend` — Express plus Prisma Client and migration tooling
3. `db` — PostgreSQL with a persistent named volume

Backend connects to Postgres on the Compose network using hostname `db`. Frontend talks to the backend over HTTP and never holds database credentials. Prisma is a backend dependency, not a fourth container.

Development should support fast local iteration. Production images should be designed for production.

## Capabilities

Define detailed behavior in feature specs. High-level scope:

**Auth and users:** register, login, password hashing, authenticated access, session or token lifecycle, profile management.

**Projects:** create, read, update, archive; owner association; authorized listing only.

**Tasks:** CRUD; project association; title, description, status, priority, optional due date; filters. Statuses: `TODO`, `IN_PROGRESS`, `DONE`. Priorities: `LOW`, `MEDIUM`, `HIGH`.

**Kanban:** status columns and authorized status changes persisted through the backend. Drag-and-drop after the basic board works.

**Dashboard:** project and task summaries plus pending, completed, and overdue counts from persisted data.

**Collaboration:** membership, explicit roles and permissions, backend resource-level authorization.

## Architecture sketch

Modular monolith. Proposed domains: `auth`, `users`, `projects`, `tasks`, `project-members`.

Typical module layout (may evolve through documented decisions):

- `domain/` entities, value objects, invariants, errors
- `dto/` input and output contracts
- `repository/` interface plus Prisma implementation
- `service/` use cases
- `controller/` HTTP translation
- `routes/` mappings and middleware
- `validators/` runtime schemas
- `tests/` relevant tests

Binding rules live in `constitution.md`. This sketch does not override them.

## Delivery order

Start with a foundation specification: repo layout, TypeScript configs, Prisma, Postgres container, backend container, frontend container, health checks, and development commands.

Verify one vertical slice:

React UI → Express route → controller → service → domain repository → Prisma → PostgreSQL.

Feature work starts only after that slice is verified.

## Definition of done

A feature is complete when its approved acceptance criteria pass, verification was actually run, domain boundaries hold, needed migrations and tests exist, and docs and memory are updated. Report unverified work honestly.
