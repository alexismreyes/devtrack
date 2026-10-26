# Implementation Plan: Authentication and Users

- **Feature ID:** 002-authentication
- **Specification:** `spec.md`
- **Status:** Verified

Inspect the repo before filling this in. Do not assume planned components exist. Application source stays under `frontend/` or `backend/`, never under `specs/`.

## 1. Summary

Add `users` and `auth` to the existing modular monolith without removing the verified `system` probe slice.

`users` owns identity, case-insensitive email uniqueness, and profile (`email` stored lowercase, `displayName` updatable). `auth` owns Argon2id password hashing, password-credential persistence, server-side sessions, and authentication middleware. Authorization for “own profile” lives in `users`, not inside the authentication middleware.

Credential transport is an HTTP-only server-side session cookie. Login and successful registration issue it. Logout revokes that session. Absolute expiry is 7 days. No refresh tokens. Multiple concurrent sessions per user are allowed. The frontend sends `credentials: 'include'` and MUST NOT store a bearer token in JS. CORS allows the configured frontend origin with credentials and MUST NOT use `*`.

`GET /health` and `GET /ready` stay public. `POST`/`GET` `/api/system/probes` require a valid session. `SystemProbe` does not gain user ownership.

Persistence stays Prisma behind owning-domain repositories, with an additive versioned migration under `backend/prisma/`. The HTTP error envelope, Node.js 22 LTS, npm, Zod, and Vitest + Testing Library + SuperTest stack stay as in `001-foundation`.

Do not implement until these artifacts are Approved. Blocking questions Q-010, Q-011, Q-012, Q-013, Q-014, and Q-018 are recorded as answered below.

## 2. Current State

Inspected 2026-10-26. `001-foundation` is Verified.

Present and in use:

- Compose services `frontend`, `backend`, `db` (PostgreSQL 16, named volume `pgdata`)
- `backend/src/modules/system/` with domain, dto, validators, repository contract, Prisma adapter, service, controller, routes, tests
- Prisma `SystemProbe` and migration `20261026120000_init_system_probe`
- Shared HTTP error handler and `{ error: { code, message } }` with codes `VALIDATION_ERROR`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`
- CORS: `cors({ origin: deps.corsOrigin })` — credentials not enabled
- `express.json()`; app composition in `backend/src/app.ts` (`createApp` takes `corsOrigin` + `systemRepository` only)
- Frontend: Vite React page `ProbePage`, typed `fetch` client using `VITE_API_URL`, GET/POST only, no `credentials`, no router, no auth UI
- Env placeholders: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db

Absent:

- `auth` and `users` modules
- User, password-credential, or session tables
- Password hashing
- Cookie parsing
- Authentication middleware
- Register/login/logout/profile UI

Limitations to respect:

- Frontend `request()` only supports GET/POST and does not send credentials
- Error codes do not yet include unauthenticated, forbidden, conflict, or invalid-credentials
- Probe routes are public today; this feature MUST change only probe-route auth, not health/ready
- Current system SuperTest cases call probes without a session and MUST be updated
- Do not add empty `projects` / `tasks` / `project-members` modules
- Do not reset the database or delete the named volume without authorization

## 3. Domain Boundaries

- Owning domains: `users` (identity, case-insensitive email uniqueness, profile, own-profile authorization); `auth` (hashing, password credential, session lifecycle, authentication middleware)
- Other domains: `system` remains for probes and readiness. Do not move probes into `users` or `auth`. Do not add a user FK or owner id to `SystemProbe`. Product domains `projects`, `tasks`, and `project-members` MUST NOT be created in this feature.
- Invariants:
  - User identity and recorded creation time are system-assigned
  - Email is unique case-insensitively and stored lowercase
  - `displayName` is required at registration and is the only updatable profile field
  - Password plaintext never persisted; hash never part of a user DTO
  - Authentication result is an actor identity; authorization compares that actor to the target user
  - A session is valid only if unrevoked and `now < issuedAt + 7 days`
  - Logout revokes the current session only
- Cross-domain interfaces:
  - `auth` MAY depend on a narrow `users` identity port (create user with email + displayName, find by email, find by id). It MUST NOT import `users` Prisma repository implementation or Prisma models.
  - `users` MUST NOT import `auth` modules. Profile handlers receive an already-authenticated actor id from HTTP middleware/controller.
  - `system` MUST NOT call `auth` or `users` repositories. Probe routes MUST use `auth` middleware only. Health and ready MUST NOT use that middleware.
- Dependency direction: domain objects MUST NOT import Express, HTTP objects, Prisma Client, or database-driver APIs. Controllers depend on services. Services depend on domain behavior and repository contracts. Prisma adapters implement those contracts. Shared infrastructure stays config, Prisma Client construction, cookie parsing, CORS, and centralized error mapping.
- Controller, service, repository, DTOs, routes, validators, domain objects: each of `users` and `auth` owns its own set under `backend/src/modules/<domain>/`. Authentication middleware belongs to `auth` (routes/middleware). Own-profile authorization belongs to the `users` service.

Suggested roots:

- `backend/src/modules/users/{domain,dto,repository,service,controller,routes,validators,tests}`
- `backend/src/modules/auth/{domain,dto,repository,service,controller,routes,middleware,validators,tests}`

Do not add extra domains to fill the folder list.

## 4. API Contract

Reuse the existing error envelope. Add error codes:

- `VALIDATION_ERROR` (existing) — `400`
- `CONFLICT` — duplicate email, `409`
- `INVALID_CREDENTIALS` — failed login, `401`, generic message that does not disclose whether the email exists
- `UNAUTHENTICATED` — missing/invalid/expired/revoked session on protected routes, `401`
- `FORBIDDEN` — authenticated but not allowed to access the target user, `403`
- `SERVICE_UNAVAILABLE` / `INTERNAL_ERROR` (existing)

Public user DTO (all success bodies that return a user): `{ id: string, email: string, displayName: string }`. Never `password`, never hash, never session id in JSON.

Cookie (all issuing responses and authenticated requests):

- Name: `devtrack_session`
- Value: opaque session id (not a JWT, not a bearer token)
- Attributes: `HttpOnly`; `Path=/`; `SameSite=Lax`; `Max-Age` 7 days (604800 seconds)
- Do not set `Secure` on the local HTTP Compose stack (Q-006 production HTTPS is deferred)
- Do not put the session id in the JSON body

### `POST /api/auth/register` (public)

- Auth: none
- Request DTO: `{ email: string, password: string, displayName: string }`
- Response DTO: public user DTO. Also `Set-Cookie: devtrack_session=...` (same cookie as login).
- Validation: `email`, `password`, and `displayName` required and non-empty after trim; `email` valid email format; normalize email to lowercase before uniqueness check and persistence; reject unknown fields that would set server-owned or hash fields
- Success: `201`
- Error cases: `400` validation; `409` `CONFLICT` duplicate email (case-insensitive); `503` database unreachable; `500` mapped, no internals

### `POST /api/auth/login` (public)

- Auth: none
- Request DTO: `{ email: string, password: string }`
- Response DTO: public user DTO plus `Set-Cookie` as above. Never return hash or bearer token.
- Validation: `email` and `password` required; email normalized to lowercase for lookup
- Success: `200`
- Error cases: `400` validation; `401` `INVALID_CREDENTIALS` (unknown email or wrong password, same message); `503`; `500`

### `POST /api/auth/logout` (protected)

- Auth: valid session cookie required
- Request DTO: none
- Response DTO: empty body
- Behavior: revoke the current session only; clear `devtrack_session` on the response (`Max-Age=0` or equivalent)
- Success: `204`
- Error cases: `401` `UNAUTHENTICATED`; `503`; `500`

No refresh route. No session-list route.

### `GET /api/users/me` (protected)

- Auth: valid session cookie
- Request DTO: none
- Response DTO: `{ id, email, displayName }`
- Success: `200`
- Error cases: `401` `UNAUTHENTICATED`; `503`; `500`

### `PATCH /api/users/me` (protected)

- Auth: valid session cookie
- Request DTO: `{ displayName: string }` only. Do not accept `email`, `password`, or hash. Extra/unknown fields → `400`.
- Validation: `displayName` required and non-empty after trim
- Response DTO: updated public user DTO
- Success: `200`
- Error cases: `400` validation; `401`; `403` if the service is asked to mutate another user id; `503`; `500`

No `GET /api/users` directory and no public `GET /api/users/:id` in this feature. The `users` service still MUST refuse `actorId !== targetUserId` so authorization stays distinct from “the route is `/me`”.

### Existing system routes

- `GET /health` — public; contract unchanged from `001-foundation`
- `GET /ready` — public; contract unchanged from `001-foundation`
- `POST /api/system/probes` — authenticated; success DTO unchanged (`{ id, recordedAt }`)
- `GET /api/system/probes` — authenticated; success DTO unchanged (`{ probes: [...] }`)
- Unauthenticated probe calls: `401` `UNAUTHENTICATED`
- Do not add `userId` / owner to probe DTOs or `SystemProbe`

### Error envelope

`{ error: { code, message } }` plus HTTP status. No secrets, stack traces, hashes, connection strings, or session secrets.

### CORS

Replace current `cors({ origin: deps.corsOrigin })` with credentials enabled for that same origin:

- `origin`: configured `CORS_ORIGIN` (never `*`)
- `credentials`: `true`

## 5. Persistence

- Prisma schema stays `backend/prisma/schema.prisma`. Add models owned by `users` and `auth`. Do not break `SystemProbe`. Do not add a user relation to `SystemProbe`.
- `User` (users), mapped table `users`:
  - `id` UUID string, system-generated, primary key
  - `email` String, unique, stored lowercase
  - `displayName` String
  - `createdAt` DateTime, system-set
- `AuthPasswordCredential` (auth), mapped table `auth_credentials`:
  - `userId` UUID, unique FK to `users.id`
  - `passwordHash` String
  - Password hash MUST NOT be selected by the `users` repository
- `AuthSession` (auth), mapped table `auth_sessions`:
  - `id` UUID string, primary key, used as the cookie value
  - `userId` UUID, FK to `users.id` (not unique: concurrent sessions allowed)
  - `createdAt` DateTime, system-set (issuance)
  - `expiresAt` DateTime = `createdAt + 7 days`
  - `revokedAt` DateTime? null until logout
  - Index on `userId`; lookup by `id`
- No refresh-token table.
- Relationships: unique email on users; unique `userId` on password-credential; many sessions per user.
- Migration: new versioned migration under `backend/prisma/migrations/`. Creation, apply/deploy, and Client generation remain separate documented steps. Additive only. Production still uses `prisma migrate deploy`. Do not `migrate reset` or delete `pgdata` without authorization.
- Repository contracts (shape, not Prisma types):
  - `users`: `create({ email, displayName })`, `findById`, `findByEmail` (canonical lowercase), `updateDisplayName` returning domain `User` without hash
  - `auth`: `savePasswordHash`, `findPasswordHashByUserId`, `createSession`, `findSessionById`, `revokeSession`
- Transactions: registration MUST create the user, password-credential hash, and session atomically. If a later insert fails, no partial user row remains. Login creates a new session row without revoking existing sessions.
- Compatibility: existing `system_probes` rows and the foundation migration remain. Map Prisma records to domain objects inside each owning adapter. Do not expose Prisma models as domain entities or API DTOs.

## 6. Frontend

No client-side routing library is required (Q-016 deferred). Local view/state switching in the existing React app is enough.

Views:

- Register (email, display name, password)
- Login (email, password)
- Logout control when authenticated
- Own profile read/update (`displayName` only; show email as read-only)
- Keep the probe page; send credentials; show unauthenticated/error state when probes return 401

States: loading, success, validation/error, unauthenticated (for profile and probes). Guest vs authenticated chrome as needed to complete the stories. No design system.

API integration: extend `frontend/src/api/client.ts` for register, login, logout, GET/PATCH profile, and `credentials: 'include'` on every `fetch` (including existing health/probe helpers). Add PATCH. Keep `VITE_API_URL`. Do not put database secrets in the frontend. Do not store session ids or bearer tokens in JS. Do not treat a hidden button as authorization.

State: page/component state plus a small in-memory current-user holder after register/login/`GET /api/users/me` is enough. No global store library required. Logout clears that in-memory user; the cookie is cleared by the backend.

## 7. Files

Expected new or updated files. Names may shift slightly; roots MUST remain `frontend/` and `backend/`.

**backend/**

- `prisma/schema.prisma` — add `User`, `AuthPasswordCredential`, `AuthSession`; keep `SystemProbe` unchanged (no owner field)
- `prisma/migrations/<timestamp>_authentication/` — additive migration
- `src/infrastructure/http/app-error.ts` — new error codes/helpers
- `src/app.ts` / `src/main.ts` — compose `auth` and `users` routers and repositories; CORS credentials; cookie parser; auth middleware on probe routes only
- `src/config/config.ts` — no new secret required for opaque DB-backed session ids; do not add unused env
- `src/modules/users/domain/` — User entity, email canonicalization, uniqueness/authorization errors
- `src/modules/users/dto/`, `validators/`, `repository/`, `service/`, `controller/`, `routes/`, `tests/`
- `src/modules/auth/domain/` — hashing/verification, session validity (7-day absolute, revoke), credential errors (no Express/Prisma)
- `src/modules/auth/dto/`, `validators/`, `repository/`, `service/`, `controller/`, `routes/`, `middleware/`, `tests/`

**frontend/**

- `src/api/client.ts`, `src/api/types.ts` — auth/profile DTOs, PATCH, `credentials: 'include'`
- `src/auth/` — register, login, logout views/tests
- `src/users/` — profile view/tests
- `src/App.tsx` — guest vs authenticated views; keep probe UI
- `src/system/ProbePage.tsx` and tests — handle 401; still use the same probe DTOs

**root**

- `.env.example` — no new secret names unless implementation is forced to add one; keep existing placeholders
- Compose: still three primary services; pass `CORS_ORIGIN` as today; frontend still never gets `DATABASE_URL`. Cookie auth does not require a new Compose service.

Do not create implementation source under `specs/`. Do not add empty product domain folders.

## 8. Dependencies and Config

**Already in use (do not replace)**

- React, Vite, TypeScript, Express, Prisma 6, Zod, Vitest, Testing Library, SuperTest, CORS, npm, Node.js 22 LTS, PostgreSQL 16

**Justified new backend dependencies**

- Password hashing: Argon2id via a maintained Node binding (`argon2`). Alternative considered: bcrypt. Do not use reversible encoding or a homemade hash. Final package recorded when the plan is approved.
- Cookie parsing: `cookie-parser` (plus `@types/cookie-parser`) so Express can read `devtrack_session`. Alternative considered: manual `Cookie` header parse; rejected as extra custom code for a standard need.

**Not in this feature**

- JWT / opaque-bearer libraries (Q-010 chose cookies)
- Refresh-token storage (Q-011)
- CSRF-token helper (posture is HttpOnly + SameSite=Lax + CORS allowlist + JSON bodies)
- Frontend router (Q-016, not required)

**Environment (names, not values)**

- Existing: `DATABASE_URL`, `CORS_ORIGIN`, `PORT`, `VITE_API_URL`, Postgres user/password/db
- No `SESSION_SECRET` required for opaque random session ids stored in `auth_sessions`
- Frontend MUST NOT receive hashing secrets or `DATABASE_URL`

Images MUST NOT bake secrets. Real values stay in uncommitted env files.

## 9. Security and Failures

- Hash passwords with Argon2id. Compare hashes through the hasher, never by returning or logging the hash to clients.
- Authentication middleware: read `devtrack_session` → load session → if missing, revoked, expired, or unknown, throw `UNAUTHENTICATED`; else attach actor user id. It MUST NOT decide profile field access.
- Users service: if `actorId !== targetUserId`, throw `FORBIDDEN`.
- Validate at HTTP entry with Zod. Controllers do not touch Prisma.
- Map domain/infrastructure errors in the centralized handler. Do not echo internals.
- Failed login: `INVALID_CREDENTIALS`, generic message, same status whether email is unknown or password is wrong.
- Duplicate email: `409`, no second row, including case variants.
- DB down: `503` envelope.
- Never return `DATABASE_URL`, hashes, plaintext passwords, session ids in JSON, or stack traces.
- Register + hash + session insert in one transaction.
- CORS: configured origin + `credentials: true`; never `*`.
- Cookie: HttpOnly, SameSite=Lax, Path=/, Max-Age 7 days; not readable by JS; not `Secure` on local HTTP.
- Probe routes authenticate; they do not authorize by probe owner because probes have no owner.

## 10. Testing

| Requirement | Test |
| ----------- | ---- |
| User identity system-assigned; email uniqueness case-insensitive | `users` domain tests, no HTTP/Prisma |
| Own-profile authorization (`actorId !== targetUserId`) | `users` service tests with a fake repository |
| Hash ≠ plaintext; verify succeeds/fails | `auth` domain tests, no HTTP/Prisma |
| Session valid / expired / revoked | `auth` domain tests, no HTTP/Prisma |
| Register creates user + hash + session atomically; `Set-Cookie` HttpOnly; body has no hash | SuperTest + persistence |
| Duplicate email including different case → 409 | API tests |
| Empty body / invalid email → 400 | API tests |
| Login success issues cookie; body has no token field | API tests |
| Bad login → 401 generic `INVALID_CREDENTIALS` | API tests |
| Profile without cookie → 401 | API tests |
| Authenticated GET/PATCH `/api/users/me`; PATCH `email` → 400 | API tests |
| Cross-user mutate rejected 403 | service and/or API tests |
| Logout revokes current session; second session still works | API tests |
| Expired session (createdAt/expiresAt in the past) → 401 | API tests |
| `GET /health` and `GET /ready` still public | existing system tests |
| Probe create/list without cookie → 401; with cookie → existing DTO | updated system SuperTest |
| UI register/login/logout/profile loading/success/error | Testing Library |
| UI fetch uses `credentials: 'include'`; no token storage | frontend tests |
| Secrets not committed | repo inspection |

Do not claim tests passed without running them. Destructive DB resets are out of scope unless later authorized.

## 11. Sequence

1. Keep artifacts Draft until spec/plan/tasks are Approved. Do not start implementation in this planning pass.
2. Inspect current `system` module, error handler, Prisma schema, CORS, and frontend client (T001–T002).
3. Add `users` domain and repository contract; additive Prisma `User` (`email`, `displayName`, `createdAt`) and migration; keep `SystemProbe` unchanged.
4. Add `auth` domain hashing, password-credential persistence, and session persistence; transactional register that also creates a session.
5. Implement login, logout, cookie issue/clear, and authentication middleware.
6. Implement users DTOs, validators, profile use cases, controller, routes with authorization in the service.
7. Enable CORS credentials; apply auth middleware to probe routes only; extend error codes.
8. Backend tests (domain, service fakes, SuperTest including cookie agent and updated system probe auth).
9. Frontend API client (`credentials: 'include'`, PATCH) and register/login/logout/profile views; keep probe UI with 401 handling.
10. Frontend tests.
11. Typecheck, targeted tests, AC scenarios on the running stack.
12. Independent review; update `memory.md` from verified results only.

## 12. Risks

- **CSRF without a dedicated token:** mitigated for this JSON SPA by HttpOnly + `SameSite=Lax` + CORS origin allowlist with credentials + JSON bodies. A CSRF-token scheme is not in scope. If a later review requires tokens, update this spec before adding them.
- **Local HTTP vs `Secure` cookies:** setting `Secure` on localhost HTTP would drop the cookie. Do not set `Secure` until production HTTPS exists (Q-006).
- **Probe routes becoming authenticated:** existing SuperTest and frontend probe tests will fail until they send credentials. Health/ready must stay public so Compose/orchestrators still work.
- **Global probe list after auth:** Q-014 forbids user ownership, so any authenticated user sees all probes. That is intentional, not a leak of profile data.
- **Generic repository temptation:** forbidden. `users` and `auth` each have their own repository. Do not share a CRUD base with `system`.
- **Users repository leaking hashes:** mitigated by an `auth`-owned credential table.
- **Authz folded into middleware:** would violate FR-008. Middleware authenticates; `users` service authorizes.
- **Frontend-only checks:** hidden routes are not protection.
- **Cookie CORS mismatch:** current `fetch` (no `credentials`) and `cors({ origin })` (no `credentials: true`) are insufficient; both MUST change together.
- **Destructive migration:** additive only; no reset/volume delete.
- **Empty product modules:** do not scaffold projects/tasks.
- **Password policy (Q-015) and lockout (Q-017):** deferred; empty passwords already invalid.
- **Hashing package advisories:** record actual audit results at implementation; do not silently skip constitution hashing.

## 13. Traceability

| Acceptance criterion | Implementation | Verification |
| -------------------- | -------------- | ------------ |
| AC-001 | `auth`+`users` register transaction, hash, session cookie | SuperTest + DB inspection that hash ≠ plaintext; `Set-Cookie` |
| AC-002 | unique lowercase email + `CONFLICT` | API test with differing case |
| AC-003 | Zod validators on register | API test |
| AC-004 | login + HttpOnly cookie | API test |
| AC-005 | generic `INVALID_CREDENTIALS` | API test |
| AC-006 | `GET /api/users/me` | API test |
| AC-007 | auth middleware | API test |
| AC-008 | `users` service actor vs target | service + API test |
| AC-009 | `PATCH /api/users/me` `displayName` only | API + persistence test |
| AC-010 | 7-day expiry, revoke on logout, concurrent sessions | API + domain tests |
| AC-011 | DTO mapping and error handler | API tests inspect bodies |
| AC-012 | keep `system` module; public health/ready | existing system tests |
| AC-013 | module layout and mapping | review + tests without Prisma types in DTOs |
| AC-014 | register/login/logout/profile UI | Testing Library + Compose check |
| AC-015 | documented test commands | executed checks |
| AC-016 | logout one session; CORS credentials | API test |
| AC-017 | probe 401 vs authenticated global list | updated system tests |

## 14. Approval

- Specification reviewed: Yes
- Architecture reviewed: Yes
- Risks understood: Yes
- Approved for task breakdown: Yes
- Approved to execute tasks: Yes
- Independent review: PASS WITH NON-BLOCKING FINDINGS
- Verified: Yes
