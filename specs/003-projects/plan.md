# Implementation Plan: Projects

- **Feature ID:** 003-projects
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

Q-019, Q-020, and Q-021 are answered and recorded in `spec.md` and this plan. These artifacts MUST stay Draft until explicitly Approved. Do not implement while status is Draft.

## 1. Summary

Add a `projects` domain to the existing modular monolith so an authenticated user can create, read, update, archive, unarchive, and list projects they own.

Owner association is server-assigned: the session actor becomes `ownerUserId`. The client cannot set or change owner. Authorization lives in the `projects` service (actor id versus owner), not in `auth` middleware. Listing is not a global directory.

Client-supplied fields are required `name` and optional `description`. Names are not unique, including per owner. Archive persists nullable `archivedAt`. Owner GET remains allowed after archive. Owner PATCH is rejected after archive (`409` `CONFLICT`) until unarchive clears `archivedAt`. Default list excludes archived rows. No `includeArchived` query parameter.

Reuse the verified session cookie, CORS credentials, Zod boundary validation, error envelope, Node.js 22 LTS, npm, PostgreSQL 16, Prisma 6, and Vitest + Testing Library + SuperTest stack. Persistence is an additive versioned Prisma migration under `backend/prisma/`. Prisma stays behind the `projects` repository.

Do not implement tasks, Kanban, dashboard, or `project-members`. Do not introduce a frontend router (Q-016). Keep `GET /health` and `GET /ready` public; probes remain authenticated as in `002-authentication`.

## 2. Current State

Inspected 2026-10-27. `001-foundation` and `002-authentication` are Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- Backend modules `system`, `auth`, `users` under `backend/src/modules/`
- Prisma models `SystemProbe`, `User`, `AuthPasswordCredential`, `AuthSession`
- Migrations `20261026120000_init_system_probe` and `20261026133000_authentication`
- Shared error envelope with codes `VALIDATION_ERROR`, `CONFLICT`, `INVALID_CREDENTIALS`, `UNAUTHENTICATED`, `FORBIDDEN`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`
- `createApp` wires CORS with credentials, `cookie-parser`, `auth` / `users` / `system` routers, and `createRequireAuth`
- Frontend: Vite React app with register/login/logout/profile and probe UI; `frontend/src/api/client.ts` supports GET/POST/PATCH with `credentials: 'include'`; no router; no projects UI
- Env: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db

Absent:

- `projects` module
- Project table / Prisma model
- Project HTTP routes
- Project UI

Limitations to respect:

- Frontend `request()` supports GET, POST, and PATCH only (sufficient: archive and unarchive are POST, not DELETE)
- Error codes do not yet include `NOT_FOUND`
- `CONFLICT` already exists (`409`); reuse it for PATCH of an archived project
- `UserNotFoundError` maps to `401` (profile/`me` semantics); project missing MUST map to `404`, not that path
- Do not add empty `tasks` or `project-members` modules
- Do not reset the database or delete the named volume without authorization
- Q-016 remains deferred; authenticated chrome already uses view/state switching in `App.tsx`

## 3. Domain Boundaries

- Owning domain: `projects` (project identity, owner association, owner-only authorization, archive/unarchive lifecycle)
- Other domains: `auth` (session authentication middleware only), `users` (existing identity; no project use cases), `system` (probes and readiness unchanged). Do not create `tasks` or `project-members`.
- Invariants:
  - Project identity and created time are system-assigned
  - Owner is the creating authenticated user and is immutable in this feature
  - `name` is required and non-empty after trim; `description` is optional (null when omitted/blank)
  - `name` is not unique, including per owner
  - Only the owner may read, update, archive, unarchive, or see the project in lists
  - Hard delete is not a domain operation
  - `archivedAt` null means active; set on archive; cleared on unarchive
  - Owner may GET while archived; owner MUST NOT PATCH while archived
  - Default list is active owned projects only
- Cross-domain interfaces:
  - `projects` MUST NOT import `users` or `auth` Prisma repository implementations or Prisma models in domain/service code
  - Owner id is the authenticated actor id passed from the HTTP controller; no `users` identity port is required for create (a valid session already identifies the user; Prisma FK enforces that the user row exists)
  - `users` MUST NOT import `projects`
  - `auth` middleware authenticates only; it MUST NOT compare project ownership
  - `system` MUST NOT call `projects`
- Dependency direction: domain objects MUST NOT import Express, HTTP objects, Prisma Client, or database-driver APIs. Controllers depend on services. Services depend on domain behavior and the repository contract. Prisma adapters implement that contract. Shared infrastructure stays config, Prisma Client construction, cookie parsing, CORS, and centralized error mapping.
- Controller, service, repository, DTOs, routes, validators, domain objects: owned by `projects` under `backend/src/modules/projects/`.

Suggested root:

- `backend/src/modules/projects/{domain,dto,repository,service,controller,routes,validators,tests}`

Do not add extra domains to fill the folder list.

## 4. API Contract

Reuse the existing error envelope. Add:

- `NOT_FOUND` — project id does not exist, `404`
- Existing: `VALIDATION_ERROR` `400`; `UNAUTHENTICATED` `401`; `FORBIDDEN` `403`; `CONFLICT` `409` (reuse for PATCH of an archived project); `SERVICE_UNAVAILABLE` `503`; `INTERNAL_ERROR` `500`

Do not reuse `UserNotFoundError` → `401` for a missing project. Do not introduce a new error code for archived PATCH.

Public project DTO (success bodies):

```
{
  id: string,
  ownerUserId: string,
  name: string,
  description: string | null,
  createdAt: string,
  archivedAt: string | null
}
```

`createdAt` and `archivedAt` (when not null) are ISO-8601. Never password, hash, session id, or Prisma metadata.

List wrapper: `{ projects: PublicProjectDto[] }`. Order: newest `createdAt` first. No pagination product feature. No query parameters in this slice.

All project routes: valid session cookie required. Owner is never taken from the body. Archive state changes only via archive/unarchive, never via PATCH.

### `POST /api/projects` (protected)

- Auth: valid session cookie
- Request DTO: `{ name: string, description?: string | null }`
- Validation: `name` required, non-empty after trim; `description` optional; omit/null/blank `description` stored as null; reject `id`, `ownerUserId`, `createdAt`, `archivedAt`, unknown fields (`strict` Zod)
- Response DTO: public project DTO; `ownerUserId` is the actor; `archivedAt` is null
- Success: `201`
- Error cases: `400` validation; `401`; `503`; `500`
- Duplicate `name` is not an error

### `GET /api/projects` (protected)

- Auth: valid session cookie
- Request DTO: none. No `includeArchived` (or other) query filter
- Response DTO: `{ projects: PublicProjectDto[] }` of projects the actor owns where `archivedAt` is null
- Success: `200`, including `{ projects: [] }`
- Error cases: `401`; `503`; `500`

### `GET /api/projects/:id` (protected)

- Auth: valid session cookie
- Request DTO: none. `:id` MUST be a UUID or `400`
- Response DTO: public project DTO (including when `archivedAt` is set)
- Success: `200` when actor owns the project
- Error cases: `400` invalid id; `401`; `403` authenticated but not owner; `404` unknown id; `503`; `500`

### `PATCH /api/projects/:id` (protected)

- Auth: valid session cookie
- Request DTO: at least one of `{ name?: string, description?: string | null }`
- Validation: if `name` is present it MUST be non-empty after trim; if `description` is present, null or blank after trim stores null; reject `id`, `ownerUserId`, `createdAt`, `archivedAt`, unknown fields
- Response DTO: updated public project DTO
- Success: `200` when the project is owned and active
- Error cases: `400`; `401`; `403`; `404`; `409` `CONFLICT` when the owner PATCHes an archived project (no field change); `503`; `500`

### `POST /api/projects/:id/archive` (protected)

- Auth: valid session cookie
- Request DTO: empty object or no body fields. Reject unknown body fields. Archive is a distinct operation from PATCH
- Response DTO: public project DTO with `archivedAt` set
- Success: `200`. Already archived: `200`, `archivedAt` unchanged (idempotent)
- Error cases: `400` invalid id or unexpected body; `401`; `403`; `404`; `503`; `500`
- No `DELETE /api/projects/:id`

### `POST /api/projects/:id/unarchive` (protected)

- Auth: valid session cookie
- Request DTO: empty object or no body fields. Reject unknown body fields. Unarchive is a distinct operation (PATCH cannot clear `archivedAt`)
- Response DTO: public project DTO with `archivedAt` null
- Success: `200`. Not archived: `200`, `archivedAt` remains null (idempotent)
- Error cases: `400` invalid id or unexpected body; `401`; `403`; `404`; `503`; `500`

### Existing routes

Unchanged from `002-authentication`: auth register/login/logout, `GET`/`PATCH /api/users/me`, public `GET /health` and `GET /ready`, authenticated probes.

### Error envelope

`{ error: { code, message } }` plus HTTP status. No secrets, stack traces, hashes, connection strings, or session secrets.

### CORS

Unchanged: configured origin with `credentials: true`; never `*`.

## 5. Persistence

- Prisma schema stays `backend/prisma/schema.prisma`. Add a `Project` model owned by `projects`. Keep `SystemProbe`, `User`, `AuthPasswordCredential`, and `AuthSession`. Do not add project or user ownership to `SystemProbe`.
- `Project` (projects), mapped table `projects`:
  - `id` UUID string, system-generated, primary key
  - `ownerUserId` UUID, FK to `users.id`, `onDelete: Restrict`
  - `name` String, required; no unique constraint (including no per-owner unique)
  - `description` String?, nullable
  - `createdAt` DateTime, system-set
  - `archivedAt` DateTime?, nullable; null means active
  - Index on `ownerUserId` for authorized listing
- `User` reverse relation `ownedProjects Project[]` is required by Prisma. The `users` repository MUST NOT select or mutate that relation. The `projects` repository is the only module that queries `Project`.
- Migration: new versioned additive migration under `backend/prisma/migrations/`. Creation, apply/deploy, and Client generation remain separate documented steps. Production still uses `prisma migrate deploy`. Do not `migrate reset` or delete `pgdata` without authorization.
- Repository contract (shape, not Prisma types):
  - `create({ ownerUserId, name, description })`
  - `findById(id)`
  - `listByOwnerId(ownerUserId)` — active only (`archivedAt` is null); no include-archived parameter in this slice
  - `update(id, { name?, description? })`
  - `archive(id)` — set `archivedAt` to now when currently null; leave unchanged if already set
  - `unarchive(id)` — set `archivedAt` to null
  - Returns domain `Project`, never Prisma types
- Transactions: single-row create/update/archive/unarchive do not need a multi-step transaction. Do not add a generic unit-of-work.
- Compatibility: existing auth and probe rows remain. Map Prisma records to domain objects inside the `projects` adapter.

Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

No client-side routing library (Q-016 deferred). Local view/state switching in `App.tsx` is enough: authenticated users already toggle profile vs guest views; add a projects view (list + create) and a selected-project view (read/update/archive/unarchive).

Views (authenticated only):

- Project list of active owned projects (empty, loading, success, error, unauthenticated)
- Create project (`name` required, `description` optional)
- Project detail / update / archive / unarchive
- After archive, remain on the detail view so the owner can still see the project and unarchive it; the list does not show archived projects
- Keep register, login, logout, own-profile, and probe UI

States: loading, empty, success, validation/error, unauthenticated, forbidden. No design system.

API integration: extend `frontend/src/api/client.ts` and `types.ts` for create, list, get, patch, archive, and unarchive. Keep `credentials: 'include'` and `VITE_API_URL`. Do not add DELETE. Do not store session ids or bearer tokens in JS. Do not treat a hidden button as authorization.

State: page/component state plus selected project id is enough. No global store library.

## 7. Files

Expected new or updated files. Names may shift slightly; roots MUST remain `frontend/` and `backend/`.

**backend/**

- `prisma/schema.prisma` — add `Project` (`id`, `ownerUserId`, `name`, `description`, `createdAt`, `archivedAt`) and `User.ownedProjects`; keep existing models
- `prisma/migrations/<timestamp>_projects/` — additive migration
- `src/infrastructure/http/app-error.ts` — `NOT_FOUND` helper
- `src/infrastructure/http/error-handler.ts` — map project-not-found, project-forbidden, and archived-update domain errors (`CONFLICT`)
- `src/app.ts` / `src/main.ts` — compose `projects` router and repository
- `src/modules/projects/domain/` — Project entity, owner authorization, archive/unarchive rules (`archivedAt`)
- `src/modules/projects/dto/`, `validators/`, `repository/`, `service/`, `controller/`, `routes/`, `tests/`

**frontend/**

- `src/api/client.ts`, `src/api/types.ts` — project DTOs and calls
- `src/projects/` — list, create, detail/update/archive/unarchive views and tests
- `src/App.tsx` — authenticated view switching for projects; keep profile and probe UI

**root**

- No new env names expected
- Compose: still three primary services; frontend still never gets `DATABASE_URL`

Do not create implementation source under `specs/`. Do not add empty `tasks` or `project-members` folders.

## 8. Dependencies and Config

**Already in use (do not replace)**

- React, Vite, TypeScript, Express, Prisma 6, Zod, Vitest, Testing Library, SuperTest, CORS, cookie-parser, argon2, npm, Node.js 22 LTS, PostgreSQL 16

**New dependencies**

- None. A frontend router is not required (Q-016). Do not add a generic repository package.

**Environment (names, not values)**

- Existing: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db
- Frontend MUST NOT receive `DATABASE_URL`

Images MUST NOT bake secrets.

## 9. Security and Failures

- Authentication middleware: unchanged; attach actor user id or throw `UNAUTHENTICATED`.
- Projects service: if actor is not owner, throw a project-forbidden domain error mapped to `FORBIDDEN`. If the row is missing, throw not-found mapped to `NOT_FOUND` (`404`), including for non-owners of missing ids (do not leak a different status that implies existence except `403` when the row exists and is not owned). If the owner PATCHes and `archivedAt` is set, throw a domain error mapped to `CONFLICT` (`409`).
- Validate at HTTP entry with Zod. Controllers do not touch Prisma.
- Map domain/infrastructure errors in the centralized handler. Do not echo internals.
- DB down: `503` envelope.
- Never return `DATABASE_URL`, hashes, plaintext passwords, session ids in JSON, or stack traces.
- Owner always from `req.actor.userId`.
- CORS unchanged.
- Do not implement membership checks “for later.”

## 10. Testing

| Requirement | Test |
| ----------- | ---- |
| System-assigned id/createdAt; owner immutable; name not unique | `projects` domain tests, no HTTP/Prisma |
| Owner authorization (`actorId !== ownerUserId`) | `projects` service tests with a fake repository |
| Archive sets `archivedAt`; unarchive clears it; PATCH while archived rejected | domain + service tests |
| Create persists owner = actor; body cannot set owner | SuperTest + persistence |
| Validation 400 for unknown/server-owned fields and empty `name` | API tests |
| Duplicate `name` create succeeds for same owner and another owner | API tests |
| GET own project 200 including archived; other user 403; missing 404; no cookie 401 | API tests |
| PATCH owner fields only; owner unchanged; PATCH archived `409` | API tests |
| List returns only actor’s active projects; empty list 200; archived excluded | API tests |
| Archive/unarchive by owner; non-owner 403; no hard delete; idempotent repeats | API tests |
| Existing health/ready public; probes/auth/profile unchanged | existing SuperTest |
| UI create/list/empty/update/archive/unarchive loading/success/error/unauthenticated/forbidden | Testing Library |
| UI fetch uses `credentials: 'include'`; no token storage; no router | frontend tests |
| Secrets not committed | repo inspection |

Do not claim tests passed without running them. Destructive DB resets are out of scope unless later authorized.

## 11. Sequence

1. Keep artifacts Draft until spec/plan/tasks are Approved. Do not start implementation in this planning pass.
2. Inspect current modules, error handler, Prisma schema, `createApp`, and frontend client (T001–T002).
3. Add `projects` domain (identity, owner, authorization, `archivedAt` archive/unarchive, PATCH-while-archived invariant) with tests without HTTP/Prisma.
4. Add Prisma `Project` (`id`, `ownerUserId`, `name`, `description`, `createdAt`, `archivedAt`) and additive migration; keep existing models; no unique on `name`.
5. Implement repository contract and Prisma adapter; map Prisma → domain inside the adapter; `listByOwnerId` returns active only.
6. Implement service use cases; authorization in the service; PATCH rejects archived.
7. Implement DTOs, Zod validators, `NOT_FOUND`, `CONFLICT` mapping for archived update, controllers, routes (including unarchive), `app.ts` wiring.
8. Backend tests (domain, service fakes, SuperTest with cookie agent).
9. Frontend API client and project views via view/state switching; keep profile and probe UI.
10. Frontend tests.
11. Typecheck, targeted tests, AC scenarios on the running stack.
12. Independent review; update `memory.md` from verified results only.

## 12. Risks

- **Later membership:** owner-only listing will need a new authorized-access rule in a future collaboration spec. Do not pre-build `project-members`.
- **No archived list filter:** after leaving detail view, an archived project is not recoverable from the default list; GET/unarchive still work by id. This is the Q-021 product choice, not a defect.
- **Generic repository temptation:** forbidden. `projects` has its own repository.
- **Authz folded into middleware:** would violate FR-008. Middleware authenticates; `projects` service authorizes.
- **Frontend-only checks:** hidden views are not protection.
- **404 vs 403:** `403` when the project exists and is not owned; `404` when it does not exist. Existence of a UUID is low sensitivity; do not silently switch to “404 for both” without a spec change.
- **PATCH vs archive lifecycle:** PATCH MUST NOT accept `archivedAt`; only archive/unarchive change that field. Reuse `CONFLICT` rather than a new code.
- **Prisma reverse relation on `User`:** must not leak into the `users` repository select list.
- **Q-016 router pressure:** list + detail can use selected-id state. Do not add a router.
- **Destructive migration:** additive only; no reset/volume delete.
- **Empty product modules:** do not scaffold tasks or membership.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `projects` create; owner = actor; `archivedAt` null | SuperTest + DB; `201` |
| AC-002 | `requireAuth` on create | API test `401` |
| AC-003 | Zod strict create; required `name` | API test `400` |
| AC-004 | GET by id as owner | API test `200` |
| AC-005 | auth middleware on all project routes | API tests `401` |
| AC-006 | service actor vs owner | service + API `403` |
| AC-007 | missing id → `NOT_FOUND` | API test `404` |
| AC-008 | PATCH `name`/`description`; owner immutable | API + persistence |
| AC-009 | `listByOwnerId` active only | API test two users |
| AC-010 | list without cookie | API test `401` |
| AC-011 | archive sets `archivedAt`; GET still 200; PATCH `409`; list excludes | API + persistence |
| AC-012 | DTO mapping and error handler | API body inspection |
| AC-013 | module layout and mapping | review + tests without Prisma types in DTOs |
| AC-014 | projects UI, no router | Testing Library + Compose check |
| AC-015 | documented test commands | executed checks |
| AC-016 | existing auth/system routes | existing SuperTest |
| AC-017 | unarchive clears `archivedAt`; list and PATCH resume | API + persistence |
| AC-018 | duplicate `name` allowed | API tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved to execute tasks: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
